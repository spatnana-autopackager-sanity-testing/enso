# Next Release

#### Enso Language & Runtime

- [Enforce conversion method return type][10468]
- [Renaming launcher executable to ensoup][10535]

[10468]: https://github.com/enso-org/enso/pull/10468
[10535]: https://github.com/enso-org/enso/pull/10535

#### Enso IDE

- ["Add node" button is not obscured by output port][10433]
- [Numeric Widget does not accept non-numeric input][10457]. This is to prevent
  node being completely altered by accidental code put to the widget.
- [Redesigned "record control" panel][10509]. Now it contains more intuitive
  "refresh" and "write all" buttons.
- [Warning messages do not obscure visualization buttons][10546].
- [Output component in collapsed function changed][10577]. It cannot be deleted
  anymore, except by directily editing the code.
- [Multiselect drop-down widget visuals are improved][10607].
- [Text displayed in monospace and whitespace rendered as symbols][10563].

[10433]: https://github.com/enso-org/enso/pull/10443
[10457]: https://github.com/enso-org/enso/pull/10457
[10509]: https://github.com/enso-org/enso/pull/10509
[10546]: https://github.com/enso-org/enso/pull/10546
[10577]: https://github.com/enso-org/enso/pull/10577
[10607]: https://github.com/enso-org/enso/pull/10607
[10563]: https://github.com/enso-org/enso/pull/10563

#### Enso Enso Standard Library

- [Renamed `Data.list_directory` to `Data.list`. Removed list support from read
  methods.][10434]
- [Renamed `Location.Start` to `Location.Left` and `Location.End` to
  `Location.Right`.][10445]
- [Renamed `Postgres_Details.Postgres` to `Postgres.Server`.][10466]
- [Remove `First` and `Last` from namespace, use auto-scoped.][10467]
- [Rename `Map` to `Dictionary` and `Set` to `Hashset`.][10474]
- [Compare two objects with `Ordering.compare` and define comparator with
  `Comparable.new`][10468]
- [Added `dec` construction function for creating `Decimal`s.][10517]
- [Added initial read support for SQLServer][10324]

[10434]: https://github.com/enso-org/enso/pull/10434
[10445]: https://github.com/enso-org/enso/pull/10445
[10466]: https://github.com/enso-org/enso/pull/10466
[10467]: https://github.com/enso-org/enso/pull/10467
[10474]: https://github.com/enso-org/enso/pull/10474
[10517]: https://github.com/enso-org/enso/pull/10517
[10324]: https://github.com/enso-org/enso/pull/10324

# Enso 2024.2

#### Enso IDE

- [Arrows navigation][10179] selected nodes may be moved around, or entire scene
  if no node is selected.
- [Added a limit for dropdown width][10198], implemented ellipsis and scrolling
  for long labels when hovered.
- [Copy-pasting multiple nodes][10194].
- The documentation editor has [formatting toolbars][10064].
- The documentation editor supports [rendering images][10205].
- [Project may be renamed in Project View][10243]
- [Fixed a bug where drop-down were not displayed for some arguments][10297].
  For example, `locale` parameter of `Equal_Ignore_Case` kind in join component.
- [Node previews][10310]: Node may be previewed by hovering output port while
  pressing <kbd>Ctrl</kbd> key (<kbd>Cmd</kbd> on macOS).
- [Google Sheets clipboard support][10327]: Create a Table component when cells
  are pasted from Google Sheets.
- [Fixed issue with two arrows being visible at once in drop-down
  widget.][10337]
- [Fixed issue where picking "<Numeric literal>" variant in some ports
  disallowed changing it again.][10337]
- [Added click through on table and vector visualisation][10340] clicking on
  index column will select row or value in seperate node
- [Copied table-viz range pastes as Table component][10352]
- [Added support for links in documentation panels][10353].
- [Added support for opening documentation in an external browser][10396].
- Added a [cloud file browser][10513].

[10064]: https://github.com/enso-org/enso/pull/10064
[10179]: https://github.com/enso-org/enso/pull/10179
[10194]: https://github.com/enso-org/enso/pull/10194
[10198]: https://github.com/enso-org/enso/pull/10198
[10205]: https://github.com/enso-org/enso/pull/10205
[10243]: https://github.com/enso-org/enso/pull/10243
[10297]: https://github.com/enso-org/enso/pull/10297
[10310]: https://github.com/enso-org/enso/pull/10310
[10327]: https://github.com/enso-org/enso/pull/10327
[10337]: https://github.com/enso-org/enso/pull/10337
[10340]: https://github.com/enso-org/enso/pull/10340
[10352]: https://github.com/enso-org/enso/pull/10352
[10353]: https://github.com/enso-org/enso/pull/10353
[10396]: https://github.com/enso-org/enso/pull/10396
[10513]: https://github.com/enso-org/enso/pull/10513

#### Enso Language & Runtime

- Support for [explicit --jvm option][10374] when launching `enso` CLI

[10374]: https://github.com/enso-org/enso/pull/10374

#### Enso Standard Library

- [Added Statistic.Product][10122]
- [Added Encoding.Default that tries to detect UTF-8 or UTF-16 encoding based on
  BOM][10130]
- [Added `Decimal` column to the in-memory database, with some arithmetic
  operations.][9950]
- [Implemented `.cast` to and from `Decimal` columns for the in-memory
  database.][10206]
- [Implemented fallback to Windows-1252 encoding for `Encoding.Default`.][10190]
- [Added Table.duplicates component][10323]
- [Renamed `Table.order_by` to `Table.sort`][10372]
- [Implemented `Decimal` support for Postgres backend.][10216]

[debug-shortcuts]:

[9950]: https://github.com/enso-org/enso/pull/9950
[10122]: https://github.com/enso-org/enso/pull/10122
[10130]: https://github.com/enso-org/enso/pull/10130
[10206]: https://github.com/enso-org/enso/pull/10206
[10190]: https://github.com/enso-org/enso/pull/10190
[10323]: https://github.com/enso-org/enso/pull/10323
[10372]: https://github.com/enso-org/enso/pull/10372
[10216]: https://github.com/enso-org/enso/pull/10216

<br/>![Release Notes](/docs/assets/tags/release_notes.svg)

#### Anonymous Data Collection

Please note that this release collects anonymous usage data which will be used
to improve Enso and prepare it for a stable release. We will switch to opt-in
data collection in stable version releases. The usage data will not contain your
code (expressions above nodes), however, reported errors may contain brief
snippets of out of context code that specifically leads to the error, like "the
method 'foo' does not exist on Number". The following data will be collected:

- Session length.
- Project management events (project open, close, rename).
- Errors (IDE crashes, Project Manager errors, Language Server errors, Compiler
  errors).
