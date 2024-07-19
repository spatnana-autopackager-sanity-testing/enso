package org.enso.interpreter.runtime.warning;

import com.oracle.truffle.api.CompilerDirectives;
import com.oracle.truffle.api.dsl.Bind;
import com.oracle.truffle.api.dsl.Cached;
import com.oracle.truffle.api.dsl.Cached.Shared;
import com.oracle.truffle.api.interop.InteropLibrary;
import com.oracle.truffle.api.interop.InvalidArrayIndexException;
import com.oracle.truffle.api.interop.UnsupportedMessageException;
import com.oracle.truffle.api.library.ExportLibrary;
import com.oracle.truffle.api.library.ExportMessage;
import com.oracle.truffle.api.nodes.Node;
import com.oracle.truffle.api.nodes.RootNode;
import com.oracle.truffle.api.source.SourceSection;
import java.util.Arrays;
import java.util.Comparator;
import org.enso.interpreter.dsl.Builtin;
import org.enso.interpreter.runtime.EnsoContext;
import org.enso.interpreter.runtime.data.ArrayRope;
import org.enso.interpreter.runtime.data.EnsoObject;
import org.enso.interpreter.runtime.data.Type;
import org.enso.interpreter.runtime.data.hash.EnsoHashMap;
import org.enso.interpreter.runtime.data.vector.ArrayLikeAtNode;
import org.enso.interpreter.runtime.data.vector.ArrayLikeAtNodeGen;
import org.enso.interpreter.runtime.data.vector.ArrayLikeHelpers;
import org.enso.interpreter.runtime.data.vector.ArrayLikeLengthNode;
import org.enso.interpreter.runtime.data.vector.ArrayLikeLengthNodeGen;
import org.enso.interpreter.runtime.library.dispatch.TypesLibrary;

@Builtin(pkg = "error", stdlibName = "Standard.Base.Warning.Warning")
@ExportLibrary(TypesLibrary.class)
public final class Warning implements EnsoObject {
  private final Object value;
  private final Object origin;
  private final ArrayRope<Reassignment> reassignments;
  private final long sequenceId;

  Warning(Object value, Object origin, long sequenceId) {
    this(value, origin, sequenceId, new ArrayRope<>());
  }

  private Warning(
      Object value, Object origin, long sequenceId, ArrayRope<Reassignment> reassignments) {
    this.value = value;
    this.origin = origin;
    this.reassignments = reassignments;
    this.sequenceId = sequenceId;
  }

  @Builtin.Method(name = "value", description = "Gets the payload of the warning.")
  @SuppressWarnings("generic-enso-builtin-type")
  public Object getValue() {
    return value;
  }

  @Builtin.Method(name = "origin", description = "Gets the payload of the warning.")
  @SuppressWarnings("generic-enso-builtin-type")
  public Object getOrigin() {
    return origin;
  }

  @Builtin.Method(
      name = "create",
      description = "Creates a new instance of the primitive warning value.",
      autoRegister = false)
  @Builtin.Specialize
  public static Warning create(EnsoContext ctx, Object payload, Object origin) {
    return new Warning(payload, origin, ctx.nextSequenceId());
  }

  @Builtin.Method(description = "Gets the list of locations where the warnings was reassigned.")
  public EnsoObject getReassignments() {
    Warning.Reassignment[] reassignmentsArray = reassignments.toArray(Warning.Reassignment[]::new);
    return ArrayLikeHelpers.wrapEnsoObjects(reassignmentsArray);
  }

  @Builtin.Method(
      name = "attach_with_stacktrace",
      description = "Attaches the given warning to the value.",
      autoRegister = false)
  @Builtin.Specialize
  public static WithWarnings attach(
      EnsoContext ctx,
      Object value,
      Object warning,
      Object origin,
      @Cached AppendWarningNode appendWarningNode) {
    var warn = new Warning(warning, origin, ctx.nextSequenceId());
    return appendWarningNode.execute(null, value, warn);
  }

  @Builtin.Method(
      description =
          "Returns `true` if the maximal number of warnings has been reached, `false` otherwise.",
      autoRegister = false)
  @Builtin.Specialize
  public static boolean limitReached(WithWarnings value, WarningsLibrary warnings) {
    return value.isLimitReached();
  }

  @Builtin.Method(
      description =
          "Returns `true` if the maximal number of warnings has been reached, `false` otherwise.",
      autoRegister = false)
  @Builtin.Specialize(fallback = true)
  public static boolean limitReached(Object value, WarningsLibrary warnings) {
    return warnings.hasWarnings(value) && warnings.isLimitReached(value);
  }

  @CompilerDirectives.TruffleBoundary
  private static void sortArray(Warning[] arr) {
    Arrays.sort(arr, Comparator.comparing(Warning::getSequenceId).reversed());
  }

  public static Warning[] fromMapToArray(EnsoHashMap set) {
    return fromMapToArray(
        set,
        ArrayLikeLengthNodeGen.getUncached(),
        ArrayLikeAtNodeGen.getUncached());
  }

  public static Warning[] fromMapToArray(EnsoHashMap set, ArrayLikeLengthNode lengthNode, ArrayLikeAtNode atNode) {
    var vec = set.getCachedVectorRepresentation();
    var vecLen = Math.toIntExact(lengthNode.executeLength(vec));
    Warning[] warns = new Warning[vecLen];
    try {
      for (int i = 0; i < vecLen; i++) {
        var entry = atNode.executeAt(vec, i);
        assert lengthNode.executeLength(entry) == 2;
        var key = atNode.executeAt(entry, 0);
        warns[i] = (Warning) key;
      }
    } catch (InvalidArrayIndexException | ClassCastException e) {
      throw CompilerDirectives.shouldNotReachHere(e);
    }
    return warns;
  }

  @Builtin.Method(
      name = "set_array",
      description = "Sets all the warnings associated with the value.",
      autoRegister = false)
  @Builtin.Specialize
  @SuppressWarnings("generic-enso-builtin-type")
  public static Object set(
      WithWarnings value,
      Object warnings,
      @Shared @Cached AppendWarningNode appendWarningNode) {
    return setGeneric(value.getValue(), warnings, appendWarningNode);
  }

  @Builtin.Method(
      name = "set_array",
      description = "Sets all the warnings associated with the value.",
      autoRegister = false)
  @SuppressWarnings("generic-enso-builtin-type")
  @Builtin.Specialize(fallback = true)
  public static Object set(
      Object value,
      Object warnings,
      @Shared @Cached AppendWarningNode appendWarningNode) {
    return setGeneric(value, warnings, appendWarningNode);
  }

  private static Object setGeneric(
      Object value,
      Object warnings,
      AppendWarningNode appendWarningNode) {
    return appendWarningNode.execute(null, value, warnings);
  }

  @CompilerDirectives.TruffleBoundary
  @Override
  public String toString() {
    return value.toString();
  }

  @ExportLibrary(InteropLibrary.class)
  public static final class Reassignment implements EnsoObject {
    private final String methodName;
    private final SourceSection location;

    public Reassignment(String methodName, SourceSection location) {
      this.methodName = methodName;
      this.location = location;
    }

    @ExportMessage
    boolean hasExecutableName() {
      return true;
    }

    @ExportMessage
    String getExecutableName() {
      return methodName;
    }

    @ExportMessage
    boolean hasSourceLocation() {
      return location != null;
    }

    @ExportMessage
    SourceSection getSourceLocation() throws UnsupportedMessageException {
      if (location == null) {
        throw UnsupportedMessageException.create();
      }
      return location;
    }
  }

  public long getSequenceId() {
    return sequenceId;
  }

  @CompilerDirectives.TruffleBoundary
  public Warning reassign(Node location) {
    RootNode root = location.getRootNode();
    SourceSection section = location.getEncapsulatingSourceSection();
    Reassignment reassignment = new Reassignment(root == null ? "" : root.getName(), section);
    return new Warning(value, origin, sequenceId, reassignments.prepend(reassignment));
  }

  @ExportMessage
  boolean hasType() {
    return true;
  }

  @ExportMessage
  Type getType(@Bind("$node") Node node) {
    return EnsoContext.get(node).getBuiltins().warning();
  }

  public static Warning wrapMapError(WarningsLibrary warningsLib, Warning warning, long index) {
    var ctx = EnsoContext.get(warningsLib);
    var error = warning.getValue();
    var wrappedError = ctx.getBuiltins().error().makeMapError(index, error);
    return Warning.create(ctx, wrappedError, warning.getOrigin());
  }
}
