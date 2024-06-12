package org.enso.languageserver.runtime

import com.typesafe.scalalogging.Logger
import org.enso.jsonrpc.Error
import org.enso.languageserver.filemanager.{
  ContentRootManager,
  FileSystemFailureMapper,
  Path
}
import org.enso.languageserver.protocol.json.ErrorApi._
import org.enso.languageserver.runtime.ExecutionApi._
import org.enso.languageserver.util.CollectionConversions._
import org.enso.polyglot.runtime.Runtime.Api
import org.enso.polyglot.runtime.Runtime.Api.{DiagnosticType, ExecutionResult}

import java.io.File
import java.lang.InternalError
import scala.concurrent.{ExecutionContext, Future}

final class RuntimeFailureMapper(contentRootManager: ContentRootManager) {
  private lazy val logger = Logger[RuntimeFailureMapper]

  /** Maps runtime Api error into a registry error.
    *
    * @param error runtime Api error
    * @return registry error
    */
  def mapApiError(
    error: Api.Error
  )(implicit ec: ExecutionContext): Future[ContextRegistryProtocol.Failure] = {
    error match {
      case Api.ContextNotExistError(contextId) =>
        Future.successful(ContextRegistryProtocol.ContextNotFound(contextId))
      case Api.EmptyStackError(contextId) =>
        Future.successful(ContextRegistryProtocol.EmptyStackError(contextId))
      case Api.InvalidStackItemError(contextId) =>
        Future.successful(
          ContextRegistryProtocol.InvalidStackItemError(contextId)
        )
      case Api.ModuleNotFound(moduleName) =>
        Future.successful(ContextRegistryProtocol.ModuleNotFound(moduleName))
      case Api.VisualizationExpressionFailed(ctx, message, result) =>
        for (diagnostic <- liftOptionOfFuture(result.map(toProtocolDiagnostic)))
          yield ContextRegistryProtocol.VisualizationExpressionFailed(
            ContextRegistryProtocol.VisualizationContext(
              ctx.visualizationId,
              ctx.contextId,
              ctx.expressionId
            ),
            message,
            diagnostic
          )
      case Api.VisualizationNotFound() =>
        Future.successful(ContextRegistryProtocol.VisualizationNotFound)
      case e =>
        Future.failed(new InternalError(s"unexpected error $e"))
    }
  }

  /** Convert the runtime failure message to the context registry protocol
    * representation.
    *
    * @param result the api execution result
    * @return the registry protocol representation fo the diagnostic message
    */
  def toProtocolFailure(
    result: Api.ExecutionResult
  )(implicit
    ec: ExecutionContext
  ): Future[ContextRegistryProtocol.ExecutionFailure] = {
    val (file, msg) = fromExecutionResultToError(result)
    for (path <- findRelativePath(file))
      yield ContextRegistryProtocol.ExecutionFailure(msg, path)
  }

  private def fromExecutionResultToError(
    result: Api.ExecutionResult
  ): (Option[File], String) = {
    result match {
      case ExecutionResult.Diagnostic(
            DiagnosticType.Error,
            message,
            file,
            _,
            _,
            _
          ) =>
        (file, message.getOrElse("unknown error"))
      case ExecutionResult.Failure(msg, path) =>
        (path, msg)
      case _ =>
        (None, s"internal error, got $result instead of an error")
    }
  }

  /** Convert the runtime diagnostic message to the context registry protocol
    * representation.
    *
    * @param diagnostic the diagnostic message
    * @return the registry protocol representation of the diagnostic message
    */
  def toProtocolDiagnostic(diagnostic: Api.ExecutionResult.Diagnostic)(implicit
    ec: ExecutionContext
  ): Future[ContextRegistryProtocol.ExecutionDiagnostic] =
    for {
      path  <- findRelativePath(diagnostic.file)
      stack <- liftSeqOfFutures(diagnostic.stack.map(toStackTraceElement))
    } yield ContextRegistryProtocol.ExecutionDiagnostic(
      toDiagnosticType(diagnostic.kind),
      diagnostic.message,
      path,
      diagnostic.location,
      diagnostic.expressionId,
      stack
    )

  /** Convert the runtime diagnostic type to the context registry protocol
    * representation.
    *
    * @param kind the diagnostic type
    * @return the registry protocol representation of the diagnostic type
    */
  private def toDiagnosticType(
    kind: Api.DiagnosticType
  ): ContextRegistryProtocol.ExecutionDiagnosticKinds.ExecutionDiagnosticKind =
    kind match {
      case Api.DiagnosticType.Error =>
        ContextRegistryProtocol.ExecutionDiagnosticKinds.Error
      case Api.DiagnosticType.Warning =>
        ContextRegistryProtocol.ExecutionDiagnosticKinds.Warning
    }

  /** Convert the runtime stack trace element to the context registry protocol
    * representation.
    *
    * @param element the runtime stack trace element
    * @return the registry protocol representation of the stack trace element
    */
  private def toStackTraceElement(element: Api.StackTraceElement)(implicit
    ec: ExecutionContext
  ): Future[ContextRegistryProtocol.ExecutionStackTraceElement] =
    for (path <- findRelativePath(element.file))
      yield ContextRegistryProtocol.ExecutionStackTraceElement(
        element.functionName,
        path,
        element.location,
        element.expressionId
      )

  private def findRelativePath(
    path: Option[File]
  )(implicit ec: ExecutionContext): Future[Option[Path]] =
    path match {
      case Some(value) =>
        contentRootManager.findRelativePath(value).recoverWith { error =>
          logger.warn(
            "Could not resolve a path within a failure, so it will contain none.",
            error
          )
          Future.successful(None)
        }
      case None =>
        Future.successful(None)
    }

}
object RuntimeFailureMapper {

  /** Create runtime failure mapper instance.
    *
    * @param contentRootManager the content root manager
    * @return a new instance of [[RuntimeFailureMapper]]
    */
  def apply(contentRootManager: ContentRootManager): RuntimeFailureMapper =
    new RuntimeFailureMapper(contentRootManager)

  /** Maps registry error into JSON RPC error.
    *
    * @param error registry error
    * @return JSON RPC error
    */
  def mapFailure(error: ContextRegistryProtocol.Failure): Error =
    error match {
      case ContextRegistryProtocol.AccessDenied =>
        AccessDeniedError
      case ContextRegistryProtocol.ContextNotFound(_) =>
        ContextNotFoundError
      case ContextRegistryProtocol.FileSystemError(error) =>
        FileSystemFailureMapper.mapFailure(error)
      case ContextRegistryProtocol.EmptyStackError(_) =>
        EmptyStackError
      case ContextRegistryProtocol.InvalidStackItemError(_) =>
        InvalidStackItemError
      case ContextRegistryProtocol.VisualizationNotFound =>
        VisualizationNotFoundError
      case ContextRegistryProtocol.ModuleNotFound(name) =>
        ModuleNotFoundError(name)
      case ContextRegistryProtocol.VisualizationExpressionFailed(
            ctx,
            msg,
            result
          ) =>
        VisualizationExpressionError(ctx, msg, result)
    }
}
