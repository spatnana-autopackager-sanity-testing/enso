/** @file An interactive button indicating the status of a project. */
import * as React from 'react'

import * as toast from 'react-toastify'

import ArrowUpIcon from 'enso-assets/arrow_up.svg'
import LogsIcon from 'enso-assets/logs.svg'
import PlayIcon from 'enso-assets/play.svg'
import StopIcon from 'enso-assets/stop.svg'
import TriangleDownIcon from 'enso-assets/triangle_down.svg'

import * as eventHooks from '#/hooks/eventHooks'
import * as toastAndLogHooks from '#/hooks/toastAndLogHooks'

import * as authProvider from '#/providers/AuthProvider'
import * as backendProvider from '#/providers/BackendProvider'
import * as modalProvider from '#/providers/ModalProvider'

import type * as assetEvent from '#/events/assetEvent'
import AssetEventType from '#/events/AssetEventType'

import LogsModal from '#/layouts/LogsModal'

import Spinner, * as spinner from '#/components/Spinner'
import SvgMask from '#/components/SvgMask'

import * as backendModule from '#/services/Backend'
import * as remoteBackend from '#/services/RemoteBackend'

import type AssetTreeNode from '#/utilities/AssetTreeNode'
import * as errorModule from '#/utilities/error'
import * as object from '#/utilities/object'

// =================
// === Constants ===
// =================

/** The size of the icon, in pixels. */
const ICON_SIZE_PX = 24
const LOADING_MESSAGE =
  'Your environment is being created. It will take some time, please be patient.'
/** The corresponding {@link spinner.SpinnerState} for each {@link backendModule.ProjectState},
 * when using the remote backend. */
const REMOTE_SPINNER_STATE: Readonly<Record<backendModule.ProjectState, spinner.SpinnerState>> = {
  [backendModule.ProjectState.closed]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.closing]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.created]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.new]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.placeholder]: spinner.SpinnerState.loadingSlow,
  [backendModule.ProjectState.openInProgress]: spinner.SpinnerState.loadingSlow,
  [backendModule.ProjectState.provisioned]: spinner.SpinnerState.loadingSlow,
  [backendModule.ProjectState.scheduled]: spinner.SpinnerState.loadingSlow,
  [backendModule.ProjectState.cloning]: spinner.SpinnerState.loadingSlow,
  [backendModule.ProjectState.opened]: spinner.SpinnerState.done,
}
/** The corresponding {@link spinner.SpinnerState} for each {@link backendModule.ProjectState},
 * when using the local backend. */
const LOCAL_SPINNER_STATE: Readonly<Record<backendModule.ProjectState, spinner.SpinnerState>> = {
  [backendModule.ProjectState.closed]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.closing]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.created]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.new]: spinner.SpinnerState.initial,
  [backendModule.ProjectState.placeholder]: spinner.SpinnerState.loadingMedium,
  [backendModule.ProjectState.openInProgress]: spinner.SpinnerState.loadingMedium,
  [backendModule.ProjectState.provisioned]: spinner.SpinnerState.loadingMedium,
  [backendModule.ProjectState.scheduled]: spinner.SpinnerState.loadingMedium,
  [backendModule.ProjectState.cloning]: spinner.SpinnerState.loadingMedium,
  [backendModule.ProjectState.opened]: spinner.SpinnerState.done,
}

// ===================
// === ProjectIcon ===
// ===================

/** Props for a {@link ProjectIcon}. */
export interface ProjectIconProps {
  readonly keyProp: string
  readonly item: AssetTreeNode
  readonly setItem: React.Dispatch<React.SetStateAction<AssetTreeNode>>
  readonly asset: backendModule.ProjectAsset
  readonly setAsset: React.Dispatch<React.SetStateAction<backendModule.ProjectAsset>>
  readonly assetEvents: assetEvent.AssetEvent[]
  /** Called when the project is opened via the {@link ProjectIcon}. */
  readonly doOpenManually: (projectId: backendModule.ProjectId) => void
  readonly doCloseEditor: () => void
  readonly doOpenEditor: (switchPage: boolean) => void
}

/** An interactive icon indicating the status of a project. */
export default function ProjectIcon(props: ProjectIconProps) {
  const { keyProp: key, item, setItem, asset, setAsset, assetEvents, doOpenManually } = props
  const { doCloseEditor, doOpenEditor } = props
  const { backend } = backendProvider.useBackend()
  const { user } = authProvider.useNonPartialUserSession()
  const { setModal, unsetModal } = modalProvider.useSetModal()
  const toastAndLog = toastAndLogHooks.useToastAndLog()
  const state = asset.projectState.type
  const setState = React.useCallback(
    (stateOrUpdater: React.SetStateAction<backendModule.ProjectState>) => {
      setAsset(oldItem => {
        let newState: backendModule.ProjectState
        if (typeof stateOrUpdater === 'function') {
          newState = stateOrUpdater(oldItem.projectState.type)
        } else {
          newState = stateOrUpdater
        }
        let newProjectState: backendModule.ProjectStateType = object.merge(oldItem.projectState, {
          type: newState,
        })
        if (!backendModule.IS_OPENING_OR_OPENED[newState]) {
          // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
          const { opened_by, ...newProjectState2 } = newProjectState
          newProjectState = newProjectState2
        } else if (user != null) {
          newProjectState = object.merge(newProjectState, {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            opened_by: user.email,
          })
        }
        return object.merge(oldItem, { projectState: newProjectState })
      })
    },
    [user, /* should never change */ setAsset]
  )
  const [spinnerState, setSpinnerState] = React.useState(spinner.SpinnerState.initial)
  const [onSpinnerStateChange, setOnSpinnerStateChange] = React.useState<
    ((state: spinner.SpinnerState | null) => void) | null
  >(null)
  const [shouldOpenWhenReady, setShouldOpenWhenReady] = React.useState(false)
  const [isRunningInBackground, setIsRunningInBackground] = React.useState(
    asset.projectState.execute_async ?? false
  )
  const [shouldSwitchPage, setShouldSwitchPage] = React.useState(false)
  const [toastId, setToastId] = React.useState<toast.Id | null>(null)
  const [openProjectAbortController, setOpenProjectAbortController] =
    React.useState<AbortController | null>(null)
  const [closeProjectAbortController, setCloseProjectAbortController] =
    React.useState<AbortController | null>(null)
  const isOtherUserUsingProject =
    backend.type !== backendModule.BackendType.local && asset.projectState.opened_by !== user?.email

  const openProject = React.useCallback(
    async (shouldRunInBackground: boolean) => {
      closeProjectAbortController?.abort()
      setCloseProjectAbortController(null)
      setState(backendModule.ProjectState.openInProgress)
      try {
        switch (backend.type) {
          case backendModule.BackendType.remote: {
            if (state !== backendModule.ProjectState.opened) {
              if (!shouldRunInBackground) {
                setToastId(toast.toast.loading(LOADING_MESSAGE))
              }
              await backend.openProject(
                asset.id,
                { executeAsync: shouldRunInBackground },
                asset.title
              )
            }
            const abortController = new AbortController()
            setOpenProjectAbortController(abortController)
            await remoteBackend.waitUntilProjectIsReady(backend, asset, abortController)
            setToastId(null)
            if (!abortController.signal.aborted) {
              setState(oldState =>
                oldState === backendModule.ProjectState.openInProgress
                  ? backendModule.ProjectState.opened
                  : oldState
              )
            }
            break
          }
          case backendModule.BackendType.local: {
            await backend.openProject(
              asset.id,
              { executeAsync: shouldRunInBackground },
              asset.title
            )
            setState(oldState =>
              oldState === backendModule.ProjectState.openInProgress
                ? backendModule.ProjectState.opened
                : oldState
            )
            break
          }
        }
      } catch (error) {
        const project = await backend.getProjectDetails(asset.id, asset.title)
        setAsset(object.merger({ projectState: project.state }))
        toastAndLog(
          errorModule.tryGetMessage(error)?.slice(0, -1) ??
            `Could not open project '${asset.title}'`
        )
        setState(backendModule.ProjectState.closed)
      }
    },
    [
      state,
      backend,
      asset,
      closeProjectAbortController,
      /* should never change */ toastAndLog,
      /* should never change */ setState,
      /* should never change */ setAsset,
    ]
  )

  React.useEffect(() => {
    if (toastId != null) {
      return () => {
        toast.toast.dismiss(toastId)
      }
    } else {
      return
    }
  }, [toastId])

  React.useEffect(() => {
    // Ensure that the previous spinner state is visible for at least one frame.
    requestAnimationFrame(() => {
      const newSpinnerState =
        backend.type === backendModule.BackendType.remote
          ? REMOTE_SPINNER_STATE[state]
          : LOCAL_SPINNER_STATE[state]
      setSpinnerState(newSpinnerState)
      onSpinnerStateChange?.(state === backendModule.ProjectState.closed ? null : newSpinnerState)
    })
  }, [state, backend.type, onSpinnerStateChange])

  React.useEffect(() => {
    onSpinnerStateChange?.(spinner.SpinnerState.initial)
    return () => {
      onSpinnerStateChange?.(null)
    }
  }, [onSpinnerStateChange])

  eventHooks.useEventHandler(assetEvents, event => {
    switch (event.type) {
      case AssetEventType.newFolder:
      case AssetEventType.uploadFiles:
      case AssetEventType.newDataLink:
      case AssetEventType.newSecret:
      case AssetEventType.copy:
      case AssetEventType.updateFiles:
      case AssetEventType.cut:
      case AssetEventType.cancelCut:
      case AssetEventType.move:
      case AssetEventType.delete:
      case AssetEventType.deleteForever:
      case AssetEventType.restore:
      case AssetEventType.download:
      case AssetEventType.downloadSelected:
      case AssetEventType.removeSelf:
      case AssetEventType.temporarilyAddLabels:
      case AssetEventType.temporarilyRemoveLabels:
      case AssetEventType.addLabels:
      case AssetEventType.removeLabels:
      case AssetEventType.deleteLabel: {
        // Ignored. Any missing project-related events should be handled by `ProjectNameColumn`.
        // `delete`, `deleteForever`, `restore`, `download`, and `downloadSelected`
        // are handled by`AssetRow`.
        break
      }
      case AssetEventType.openProject: {
        if (event.id !== asset.id) {
          if (!event.runInBackground && !isRunningInBackground) {
            setShouldOpenWhenReady(false)
            if (!isOtherUserUsingProject && backendModule.IS_OPENING_OR_OPENED[state]) {
              // void closeProject(false)
            }
          }
        } else {
          setShouldOpenWhenReady(!event.runInBackground)
          setShouldSwitchPage(event.shouldAutomaticallySwitchPage)
          setIsRunningInBackground(event.runInBackground)
          void openProject(event.runInBackground)
        }
        break
      }
      case AssetEventType.closeProject: {
        if (event.id === asset.id) {
          setShouldOpenWhenReady(false)
          void closeProject(false)
        }
        break
      }
      case AssetEventType.newProject: {
        if (event.placeholderId === key) {
          setOnSpinnerStateChange(() => event.onSpinnerStateChange)
        } else if (event.onSpinnerStateChange === onSpinnerStateChange) {
          setOnSpinnerStateChange(null)
        }
        break
      }
    }
  })

  React.useEffect(() => {
    if (state === backendModule.ProjectState.opened) {
      if (shouldOpenWhenReady) {
        doOpenEditor(shouldSwitchPage)
        setShouldOpenWhenReady(false)
      }
    }
    // `doOpenEditor` is a callback, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenWhenReady, shouldSwitchPage, state])

  const closeProject = async (triggerOnClose = true) => {
    if (triggerOnClose) {
      doCloseEditor()
    }
    setToastId(null)
    setShouldOpenWhenReady(false)
    setState(backendModule.ProjectState.closing)
    onSpinnerStateChange?.(null)
    setOnSpinnerStateChange(null)
    openProjectAbortController?.abort()
    setOpenProjectAbortController(null)
    const abortController = new AbortController()
    setCloseProjectAbortController(abortController)
    if (backendModule.IS_OPENING_OR_OPENED[state]) {
      try {
        if (
          backend.type === backendModule.BackendType.local &&
          state === backendModule.ProjectState.openInProgress
        ) {
          // Projects that are not opened cannot be closed.
          // This is the only way to wait until the project is open.
          await backend.openProject(asset.id, null, asset.title)
        }
        try {
          await backend.closeProject(asset.id, asset.title)
        } catch {
          // Ignored. The project is already closed.
        }
      } finally {
        if (!abortController.signal.aborted) {
          setState(backendModule.ProjectState.closed)
        }
      }
    }
  }

  const triangleButton = item.children != null && (
    <SvgMask
      src={TriangleDownIcon}
      className={`m-icon-in-project-icon hidden size-icon cursor-pointer transition-transform duration-arrow group-hover:inline-block ${
        item.isProjectExpanded ? '' : '-rotate-90'
      }`}
      onClick={event => {
        event.stopPropagation()
        setItem(oldItem => oldItem.with({ isProjectExpanded: !oldItem.isProjectExpanded }))
      }}
    />
  )

  switch (state) {
    case null:
    case backendModule.ProjectState.created:
    case backendModule.ProjectState.new:
    case backendModule.ProjectState.closing:
    case backendModule.ProjectState.closed:
      return (
        <>
          {triangleButton}
          <button
            className="size-project-icon"
            onClick={clickEvent => {
              clickEvent.stopPropagation()
              unsetModal()
              doOpenManually(asset.id)
            }}
          >
            <SvgMask alt="Open in editor" src={PlayIcon} className="size-project-icon" />
          </button>
        </>
      )
    case backendModule.ProjectState.openInProgress:
    case backendModule.ProjectState.scheduled:
    case backendModule.ProjectState.provisioned:
    case backendModule.ProjectState.cloning:
    case backendModule.ProjectState.placeholder:
      return (
        <button
          disabled={isOtherUserUsingProject}
          {...(isOtherUserUsingProject ? { title: 'Someone else is using this project.' } : {})}
          className="size-project-icon selectable enabled:active"
          onClick={async clickEvent => {
            clickEvent.stopPropagation()
            unsetModal()
            await closeProject(!isRunningInBackground)
          }}
        >
          <div className={`relative h ${isRunningInBackground ? 'text-green' : ''}`}>
            <Spinner size={ICON_SIZE_PX} state={spinnerState} />
          </div>
          <SvgMask
            alt="Stop execution"
            src={StopIcon}
            className={`size-project-icon ${isRunningInBackground ? 'text-green' : ''}`}
          />
        </button>
      )
    case backendModule.ProjectState.opened:
      return (
        <>
          {triangleButton}
          <div>
            <button
              disabled={isOtherUserUsingProject}
              {...(isOtherUserUsingProject ? { title: 'Someone else is using this project.' } : {})}
              className="size-project-icon selectable enabled:active"
              onClick={async clickEvent => {
                clickEvent.stopPropagation()
                unsetModal()
                await closeProject(!isRunningInBackground)
              }}
            >
              <div className={`relative h ${isRunningInBackground ? 'text-green' : ''}`}>
                <Spinner className="size-project-icon" state={spinnerState} />
              </div>
              <SvgMask
                alt="Stop execution"
                src={StopIcon}
                className={`size-project-icon ${isRunningInBackground ? 'text-green' : ''}`}
              />
            </button>
            {!isOtherUserUsingProject && !isRunningInBackground && (
              <button
                className="size-project-icon"
                onClick={clickEvent => {
                  clickEvent.stopPropagation()
                  unsetModal()
                  doOpenEditor(true)
                }}
              >
                <SvgMask alt="Open in editor" src={ArrowUpIcon} className="size-project-icon" />
              </button>
            )}
            {isRunningInBackground && (
              <button
                className="size-project-icon"
                onClick={async clickEvent => {
                  clickEvent.stopPropagation()
                  unsetModal()
                  const logs = await backend.getLogs(asset.id, asset.title)
                  setModal(<LogsModal logs={logs} />)
                }}
              >
                <SvgMask alt="Show logs" src={LogsIcon} className="size-project-icon" />
              </button>
            )}
          </div>
        </>
      )
  }
}
