import sbt._
import sbt.util.CacheStoreFactory

/** A helper for generating manifests for bundled libraries. */
object LibraryManifestGenerator {

  /** Represents a library that will be bundled with the engine and needs to
    * have its manifest generated.
    */
  case class BundledLibrary(name: String, version: String)

  /** Generates manifests for the provided libraries.
    *
    * It assumes that the engine-runner/assembly task is up to date (as it uses
    * its artifacts).
    *
    * @param javaOpts The java options to pass to the manifest generator.
    */
  def generateManifests(
    libraries: Seq[BundledLibrary],
    distributionRoot: File,
    log: Logger,
    javaOpts: Seq[String],
    cacheStoreFactory: CacheStoreFactory
  ): Unit =
    for (BundledLibrary(qualifiedName, version) <- libraries) {
      val (namespace, name) = qualifiedName.split('.') match {
        case Array(namespace, name) => (namespace, name)
        case _ =>
          throw new IllegalArgumentException(
            s"Invalid library name [$qualifiedName]."
          )
      }
      val projectPath =
        distributionRoot / "lib" / namespace / name / version

      val store =
        cacheStoreFactory.make(s"library-manifest-$namespace-$name-$version")
      val sources = (projectPath / "src").allPaths.get
      Tracked.diffInputs(store, FileInfo.hash)(sources.toSet) { diff =>
        def manifestExists = (projectPath / "manifest.yaml").exists()
        if (diff.modified.nonEmpty || !manifestExists) {
          log.info(s"Regenerating manifest for [$projectPath].")
          runGenerator(projectPath, javaOpts, log)
        } else {
          log.debug(s"[$projectPath] manifest is up to date.")
        }
      }
    }

  private def runGenerator(
    projectPath: File,
    javaOpts: Seq[String],
    log: Logger
  ): Unit = {
    val javaCommand =
      ProcessHandle.current().info().command().asScala.getOrElse("java")
    val command = Seq(
      javaCommand
    ) ++ javaOpts ++ Seq(
      "--update-manifest",
      "--in-project",
      projectPath.getCanonicalPath
    )

    val commandText = command.mkString(" ")
    log.debug(s"Running [$commandText].")
    val exitCode = sys.process
      .Process(
        command,
        None,
        "ENSO_EDITION_PATH" -> file("distribution/editions").getCanonicalPath
      )
      .!
    if (exitCode != 0) {
      val message = s"Command [$commandText] has failed with code $exitCode."
      log.error(message)
      throw new RuntimeException(message)
    }
  }

}
