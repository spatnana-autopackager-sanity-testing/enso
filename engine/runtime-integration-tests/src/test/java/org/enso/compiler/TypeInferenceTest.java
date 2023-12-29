package org.enso.compiler;

import org.enso.compiler.context.FreshNameSupply;
import org.enso.compiler.context.ModuleContext;
import org.enso.compiler.core.ir.Module;
import org.enso.compiler.data.CompilerConfig;
import org.enso.compiler.pass.PassConfiguration;
import org.enso.compiler.pass.PassManager;
import org.enso.compiler.pass.analyse.types.TypeInference;
import org.enso.compiler.test.CompilerRunner;
import org.enso.interpreter.test.TestBase;
import org.enso.pkg.QualifiedName;
import org.enso.polyglot.RuntimeOptions;
import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Source;
import org.graalvm.polyglot.Value;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Ignore;
import org.junit.Test;
import scala.Option;
import scala.collection.immutable.Seq;
import scala.collection.immutable.Seq$;

import java.net.URI;

public class TypeInferenceTest extends CompilerTest {
  @Test
  public void zeroAryCheck() throws Exception {
    final URI uri = new URI("memory://zeroAryCheck.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value x
                    
                const -> My_Type = My_Type.Value 42
                    
                foo =
                    x = const
                    y = My_Type.Value 23
                    _ = y
                    x
                    
                bar =
                    y = foo
                    y
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
    System.out.println(module);
    // TODO checking what is inferred - probably need instrumentation?
  }

  @Test
  public void functionReturnCheck() throws Exception {
    final URI uri = new URI("memory://functionReturnCheck.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value x
                    
                add x y -> My_Type = My_Type.Value (x.x+y.x)
                    
                foo z =
                    a = My_Type.Value 42
                    b = add a z
                    b
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
    // TODO checking what is inferred
  }

  @Test
  public void argChecks() throws Exception {
    final URI uri = new URI("memory://argChecks.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value v
                    
                f1 (x1 : My_Type) = My_Type.Value (x1.v + x1.v)
                                
                f2 : My_Type -> My_Type
                f2 x2 = My_Type.Value (x2.v + x2.v)
                                
                f3 (x3 : My_Type) -> My_Type = My_Type.Value (x3.v + x3.v)
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }


  @Test
  public void ascribedExpressions() throws Exception {
    final URI uri = new URI("memory://ascribedExpressions.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value x
                    
                f x =
                    y = (x : My_Type)
                    My_Type.Value (y.x + y.x)
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }


  @Test
  public void advancedAscribedExpressions() throws Exception {
    final URI uri = new URI("memory://advancedAscribedExpressions.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value x
                type Other_Type
                    Value y
                f z =
                    y1 = (z : My_Type | Other_Type)
                    y2 = (z : My_Type & Other_Type)
                    My_Type.Value (y1.x + y2.x)
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }

  @Test
  public void ascribedFunctionType() throws Exception {
    final URI uri = new URI("memory://ascribedFunctionType.enso");
    final Source src =
        Source.newBuilder("enso", """
                type My_Type
                    Value x
                type Other_Type
                    Value y
                f z w =
                    f1 = (z : My_Type -> Other_Type)
                    f2 = (w : My_Type -> My_Type -> Other_Type)
                    f2 (f1 (My_Type.Value 42))
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    // Here we will only know that both f1 and f2 are Any -> Any - because the ascribed check only really performs a
    // `is_a Function` check, we do not know anything about the argument nor return type of this function,
    // unfortunately.
    var module = compile(src);
  }

  @Test
  public void literals() throws Exception {
    final URI uri = new URI("memory://literals.enso");
    final Source src =
        Source.newBuilder("enso", """
                f =
                    x = 42
                    y = "foo"
                    z = 1.5
                    x.to_text + y + z.to_text
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }

  @Test
  public void commonIfThenElse() throws Exception {
    final URI uri = new URI("memory://commonIfThenElse.enso");
    final Source src =
        Source.newBuilder("enso", """
                f x = if x == 10 then 1 else 2
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }


  @Ignore
  @Test
  public void commonCase() throws Exception {
    final URI uri = new URI("memory://commonCase.enso");
    final Source src =
        Source.newBuilder("enso", """
                f x = case x of
                    i : Integer -> i
                    _ -> 0
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }

  @Ignore
  @Test
  public void inferBoundsFromCase() throws Exception {
    final URI uri = new URI("memory://inferBoundsFromCase.enso");
    final Source src =
        Source.newBuilder("enso", """
                f x = case x of
                    _ : Integer -> x
                    _ -> 0
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    var module = compile(src);
  }

  @Ignore
  @Test
  public void sumTypeFromIf() throws Exception {
    final URI uri = new URI("memory://sumTypeFromIf.enso");
    final Source src =
        Source.newBuilder("enso", """
                f x = if x == 1 then "foo" else 42
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();
    // Text | Integer
    var module = compile(src);
  }

  @Ignore
  @Test
  public void sumTypeFromIfWithoutElse() throws Exception {
    final URI uri = new URI("memory://sumTypeFromIf.enso");
    final Source src =
        Source.newBuilder("enso", """
                f x = if x == 1 then "foo"
                """, uri.getAuthority())
            .uri(uri)
            .buildLiteral();

    // Text | Nothing
    var module = compile(src);
  }

  private Object compile(Source src) {
    System.out.println("\n\n\n=========================================\nSOURCE " + src.getURI().toString() + "\n");
    Module rawModule = parse(src.getCharacters());

    var compilerConfig = new CompilerConfig(false, true, true, true, true, Option.empty());
    var passes = new Passes(compilerConfig, Option.empty());
    @SuppressWarnings("unchecked") var passConfig = new PassConfiguration((Seq<PassConfiguration.ConfigPair<?>>) Seq$.MODULE$.empty());
    PassManager passManager = new PassManager(passes.passOrdering(), passConfig);
    var compilerRunner = new CompilerRunner() {
      @Override
      public CompilerConfig defaultConfig() {
        return compilerConfig;
      }

      @Override
      public void org$enso$compiler$test$CompilerRunner$_setter_$defaultConfig_$eq(CompilerConfig x$1) {
      }
    };
    var moduleName = QualifiedName.simpleName(src.getName().replace(".enso", ""));
    ModuleContext moduleContext = compilerRunner.buildModuleContext(moduleName, Option.apply(new FreshNameSupply()), Option.empty(), compilerConfig, false);
    Module processedModule = passManager.runPassesOnModule(rawModule, moduleContext);
    return processedModule;
  }
}
