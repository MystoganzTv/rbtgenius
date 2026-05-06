import { useEffect, useState } from "react";

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 250;
const TOAST_DEFAULT_DURATION = 4000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();
const toastDismissTimeouts = new Map();

function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function clearFromRemoveQueue(toastId) {
  const timeout = toastTimeouts.get(toastId);

  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
}

function addToDismissQueue(toastId, duration = TOAST_DEFAULT_DURATION) {
  if (toastDismissTimeouts.has(toastId) || duration === Infinity || duration <= 0) {
    return;
  }

  const timeout = setTimeout(() => {
    toastDismissTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.DISMISS_TOAST,
      toastId,
    });
  }, duration);

  toastDismissTimeouts.set(toastId, timeout);
}

function clearFromDismissQueue(toastId) {
  const timeout = toastDismissTimeouts.get(toastId);

  if (timeout) {
    clearTimeout(timeout);
    toastDismissTimeouts.delete(toastId);
  }
}

const listeners = [];
let memoryState = { toasts: [] };

const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
      };
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        clearFromDismissQueue(toastId);
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          clearFromDismissQueue(toast.id);
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        state.toasts.forEach((toast) => clearFromDismissQueue(toast.id));
        return {
          ...state,
          toasts: [],
        };
      }

      clearFromDismissQueue(action.toastId);
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function toast({ ...props }) {
  const id = genId();
  const duration = props.duration ?? TOAST_DEFAULT_DURATION;

  const update = (nextProps) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...nextProps, id },
    });
  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dismiss();
        }
      },
    },
  });

  addToDismissQueue(id, duration);

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);

    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { actionTypes, clearFromRemoveQueue, reducer, useToast, toast };
