import React from 'react';
import ReactReconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants';

// Define your "node" types
// 
// In a browser, React works with real DOM nodes (div, span etc.)
// In our custom renderer, we define our own node shapes.
// These are just plain JS objects — but they represent our "virtual DOM".

// An "Instance" is like a DOM element — it has a type (like "div"),
// props (like { className: "foo" }), and children (nested nodes).
export type Instance = {
  type: string;
  props: Record<string, any>;
  children: (Instance | TextInstance)[];
};

// A "TextInstance" is a raw text node — like the "Hello" in <div>Hello</div>
// It's separate from Instance because text nodes don't have props or children.
export type TextInstance = {
  type: 'TEXT';
  value: string;
};

// The "Container" is the root of your tree — like document.body in the browser.
// Everything gets mounted into this. We also store the reconciler root on it.
export type Container = {
  children: (Instance | TextInstance)[];
  _root?: any; // will hold the reconciler's internal fiber root
};

// The Host Config
//
// This is the heart of a custom renderer.
// React's reconciler doesn't know anything about your target environment.
// It asks YOU how to create nodes, attach children, update props, etc.
// You answer by implementing these methods.
//
// Think of it as React saying:
//   "I've figured out WHAT needs to happen, now YOU tell me HOW."
// 
// A "host config" is an object that you need to provide, and that describes how to make something happen in the "host" environment (e.g. DOM, canvas, console, or whatever your rendering target is). It looks like this:



const hostConfig: ReactReconciler.HostConfig<
  string,               // Type              — the type of elements e.g. "div", "view"
  Record<string, any>,  // Props             — props object e.g. { color: "red" }
  Container,            // Container         — your root container type
  Instance,             // Instance          — your element node type
  TextInstance,         // TextInstance       — your text node type
  never,                // SuspenseInstance  — we don't support Suspense boundaries
  never,                // HydratableInstance — we don't support SSR hydration
  never,                // FormInstance      — we don't support form instances
  Instance | TextInstance, // PublicInstance — what refs point to (instance or text node)
  {},                   // HostContext       — internal context passed down the tree
  never,                // ChildSet          — only needed for persistent mode
  number,               // TimeoutHandle     — return type of setTimeout
  number,               // NoTimeout         — the "no timeout" sentinel value (-1)
  unknown               // TransitionStatus  — transition state (we don't use it)
> = {

  // ---- Renderer Mode Flags ----

  // Mutation mode = update nodes in place, like the DOM.
  // This is the most common mode and what we're using.
  supportsMutation: true,

  // Persistence mode = create a new tree on every update (like React Native's old renderer).
  // We don't need this.
  supportsPersistence: false,

  // Hydration mode = for SSR, attaching to server-rendered HTML.
  // We don't need this either.
  supportsHydration: false,

  // Sentinel value meaning "no scheduled timeout"
  noTimeout: -1,

  // True if this is the main renderer. Set false if you're building
  // a secondary renderer that renders inside another renderer (like react-three-fiber inside a browser).
  isPrimaryRenderer: true,

  NotPendingTransition: null,
  HostTransitionContext: React.createContext(null) as unknown as ReactReconciler.ReactContext<unknown>,

  setCurrentUpdatePriority(_newPriority: number) {},
  resolveUpdatePriority() {
    return DefaultEventPriority;
  },
  resetFormInstance(_form: never) {},
  requestPostPaintCallback(callback: (time: number) => void) {
    requestAnimationFrame(callback);
  },
  shouldAttemptEagerTransition() {
    return false;
  },
  trackSchedulerEvent() {},
  resolveEventType(): null {
    return null;
  },
  resolveEventTimeStamp() {
    return 0;
  },
  maySuspendCommit() {
    return false;
  },
  preloadInstance() {
    return false;
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady(): null {
    return null;
  },

  // ---- RENDER PHASE ----
  // These methods are called while React is building the tree in memory.
  // No side effects yet — React is just figuring out what the tree should look like.


  // Called when React encounters a JSX element like <view color="red">
  // You create and return your node object here.
  // Think of it as your version of document.createElement().
  createInstance(type, props, _rootContainer, _hostContext) {
    return {
      type,       // e.g. "view", "text", "box" — whatever your renderer supports
      props,      // e.g. { color: "red", onClick: fn }
      children: []
    };
  },

  // Called when React encounters raw text, like the "Hello" in <view>Hello</view>
  // Text nodes are separate from element nodes — they have no props or children.
  createTextInstance(text, _rootContainer, _hostContext) {
    return { type: 'TEXT', value: text };
  },

  // Called to attach a child to a parent during the initial render (before commit).
  // React builds the tree bottom-up, so children are appended before the parent
  // is attached to the container.
  appendInitialChild(parent, child) {
    parent.children.push(child);
  },

  // Same as appendInitialChild but called during updates (not initial render).
  appendChild(parent, child) {
    parent.children.push(child);
  },

  // Called after all children have been set on a new instance.
  // Return true if you want React to call commitMount() on this instance after it's mounted.
  // Useful for things like auto-focus. We don't need it so we return false.
  finalizeInitialChildren(_instance, _type, _props, _rootContainer, _hostContext) {
    return false;
  },

  // React calls this to decide whether to treat children as a single text node.
  // If you return true, React won't call createTextInstance — it'll just set
  // the text as a prop instead. Useful for leaf text nodes.
  shouldSetTextContent(_type, props) {
    return (
      typeof props.children === 'string' ||
      typeof props.children === 'number'
    );
  },

  // ---- COMMIT PHASE ----
  // React is now confident about what to render.
  // These methods actually apply changes to your target environment.

  // Called when a new child needs to be attached to the root container.
  // This is like document.body.appendChild() — the tree finally becomes "real".
  appendChildToContainer(container, child) {
    container.children.push(child);
  },

  // Called when a child needs to be inserted before a specific sibling.
  // Like DOM's insertBefore().
  insertBefore(parent, child, beforeChild) {
    const index = parent.children.indexOf(beforeChild as Instance);
    parent.children.splice(index, 0, child);
  },

  // Same as insertBefore but for the root container.
  insertInContainerBefore(container, child, beforeChild) {
    const index = container.children.indexOf(beforeChild as Instance);
    container.children.splice(index, 0, child);
  },

  // Called when a child needs to be removed from a parent.
  removeChild(parent, child) {
    parent.children = parent.children.filter(c => c !== child);
  },

  // Same as removeChild but for the root container.
  removeChildFromContainer(container, child) {
    container.children = container.children.filter(c => c !== child);
  },

  // Called when an existing instance's props have changed.
  commitUpdate(instance, _type, _prevProps, nextProps) {
    instance.props = nextProps;
  },

  // Called when a text node's content has changed.
  commitTextUpdate(textInstance, _oldText, newText) {
    textInstance.value = newText;
  },

  // Called after commitMount returns true in finalizeInitialChildren.
  // Used for things like focusing an input after mount. We don't need it.
  // commitMount() {},


  // ---- CONTEXT ----
  // React uses "host context" to pass environment info down the tree internally.
  // This is NOT the same as React.createContext() — it's purely internal to the renderer.
  // Example use: the DOM renderer uses this to track whether we're inside an SVG
  // (which needs different namespace handling).


  // Called once for the root container to create the initial host context.
  getRootHostContext(_rootContainer) {
    return {};
  },

  // Called for each element to potentially modify the context for its children.
  // Here we just pass context through unchanged.
  getChildHostContext(parentContext, _type, _rootContainer) {
    return parentContext;
  },


  // ---- REFS ----

  // What value a ref gets when attached to a host component.
  // We just return the instance itself.
  getPublicInstance(instance) {
    return instance;
  },


  // ---- LIFECYCLE HOOKS ----

  // Called right before React starts committing changes.
  // You can snapshot something here (like scroll position in the DOM renderer).
  // Return value is passed to resetAfterCommit.
  prepareForCommit(_containerInfo) {
    return null;
  },

  // Called after React has committed all changes.
  // Good place to trigger a re-render or flush output to your target.
  resetAfterCommit(_containerInfo) {},

  // Called when a portal is created. We don't support portals.
  preparePortalMount(_containerInfo) {},

  scheduleTimeout(fn: (...args: unknown[]) => unknown, delay?: number) {
    return setTimeout(fn as TimerHandler, delay) as unknown as number;
  },

  cancelTimeout(id: number) {
    clearTimeout(id);
  },

  // Called to clear text content on an instance. Used when switching
  // from text children to non-text children.
  resetTextContent() {},



  // ---- SCHEDULING ----
  // React's concurrent mode needs to schedule work at the right priority.


  // Tells React what priority level to use for the current update.
  // DefaultEventPriority is fine for most custom renderers.
  getCurrentUpdatePriority() {
    return DefaultEventPriority;
  },

  // React needs a way to schedule microtasks for its internal batching.
  // We prefer queueMicrotask (fastest), fall back to Promise.resolve().
  scheduleMicrotask:
    typeof queueMicrotask !== 'undefined'
      ? queueMicrotask
      : (cb: () => void) => Promise.resolve().then(cb),

  // These are for React's internal focus tracking (used in the DOM renderer).
  // We don't need them.
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  getInstanceFromNode(_node: unknown) {
    return null;
  },
  prepareScopeUpdate(_scopeInstance: unknown, _instance: unknown) {},
  getInstanceFromScope(_scopeInstance: unknown) {
    return null;
  },
  detachDeletedInstance(_node: Instance) {},
};

// ============================================================
// Create the reconciler
//
// We pass our host config to ReactReconciler and get back a reconciler instance.
// This reconciler knows how to diff component trees and call our host config methods
// to apply changes.
// ============================================================

export default ReactReconciler(hostConfig);