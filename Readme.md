React's rendering happens in two big phases:

```
Your JSX
   ↓
[RENDER PHASE] — React figures out what changed
   ↓
[COMMIT PHASE] — React applies those changes

Great question. Let me explain the **"why"** behind all of this.

---

We're using [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler), which is the core package that lets you write a custom renderer for React. This package contains the logic React uses to update the UI, but it's agnostic to *how* things get rendered — that's up to you.

By hooking into this package, you can tell React how to create, update, and remove nodes in your own environment — whether that's the DOM, a canvas, a terminal, or something else. The contract is well-documented in the package's README, and your implementation (called the "host config") is what connects React's virtual tree to your actual UI.

React doesn't know what to do with it. React Core just builds a **description** of what the UI should look like — a tree of objects. It has no idea whether you're rendering to a browser, a terminal, a PDF, or a game engine.

That's where **your renderer comes in**. You're essentially writing a plugin that tells React *"when you need to create a node, here's how I do it in my world"*.

---

## Where do these methods come from?

They come from the **react-reconciler contract**. When Facebook wrote the reconciler, they designed it to be target-agnostic. They said:

> *"We'll handle all the diffing, state management, and scheduling. But you have to implement these specific methods so we know how to talk to your environment."*

It's like an **interface or a protocol**. The reconciler calls these methods at specific moments in its lifecycle. You don't call them — React does.

---

Every method in your host config belongs to one of these phases. That's why they exist.

---

## Render Phase methods — "figure out what the tree looks like"

React is walking your component tree and building a virtual representation. No actual changes happen yet.

```typescript
createInstance(type, props)
```
React found a JSX element. It's asking you: *"make me a node for this"*. You return your plain object. This is called for every `<view>`, `<box>`, or whatever element type you support.

```typescript
createTextInstance(text)
```
React found raw text inside JSX. Same idea, but for text. Text nodes are always separate because they behave differently — no props, no children.

```typescript
appendInitialChild(parent, child)
```
React builds the tree **bottom-up**. It creates the deepest children first, then works its way up. This method is how React attaches a child to its parent as it builds upward. Think of it like assembling furniture from the inside out.

```typescript
shouldSetTextContent(type, props)
```
React is asking: *"are the children of this element just a simple string?"*. If yes, React skips `createTextInstance` entirely and treats the text as a prop. This is an optimization.

```typescript
finalizeInitialChildren()
```
React is done building a node and all its children. Last chance to do setup. Return `true` only if you need `commitMount` called later (e.g. for auto-focus). We return `false` because we don't need that.

```typescript
prepareUpdate(instance, type, oldProps, newProps)
```
On re-renders, React asks: *"did anything change between old and new props?"*. Whatever you return here is the "update payload" — the diff. Return `null` to tell React nothing changed, which skips the commit entirely. This is a **performance hook**.

---

## Commit Phase methods — "now actually apply the changes"

React is confident about what the tree should look like. Now it applies changes for real.

```typescript
appendChildToContainer(container, child)
```
The fully built tree is ready. Attach it to the root container. This is the moment your tree becomes "real" — like `document.body.appendChild()`.

```typescript
commitUpdate(instance, type, prevProps, nextProps)
```
A component re-rendered with new props. Update the existing node. React reuses nodes when possible rather than recreating them — that's what makes React fast.

```typescript
commitTextUpdate(textInstance, oldText, newText)
```
Same but for text nodes. The text changed, update it.

```typescript
insertBefore / insertInContainerBefore`
```
A child needs to be inserted at a specific position, not just appended. This handles cases like list reordering.

```typescript
removeChild / removeChildFromContainer
```
A component was unmounted. Clean it up.

---

## The "boring" methods — why do they exist?

```typescript
getRootHostContext()
getChildHostContext()
```
These exist because some renderers need to pass environment info down the tree. The DOM renderer uses this to know when it's inside an `<svg>` tag (which needs different namespace handling). We don't need it, so we return empty objects. But React still calls these so we have to implement them.

```typescript
getPublicInstance()
```
When you do `ref.current` on a host element, React calls this to know what value to give you. We return the instance itself.

```typescript
prepareForCommit()
resetAfterCommit()
```
Hooks that fire before and after the commit phase. The DOM renderer uses `prepareForCommit` to snapshot scroll position so it can restore it after React moves things around. We don't need that.

---

## The scheduling methods — why does React care about this?

```typescript
scheduleMicrotask
getCurrentUpdatePriority()
```
React's concurrent mode doesn't render everything at once. It can pause, prioritize urgent updates (like typing) over less urgent ones (like data fetching). To do this it needs to schedule work — and it needs **you** to provide the scheduling primitives for your environment. In a browser you use `queueMicrotask`. In a Node.js renderer you might use `process.nextTick`.

---

## The React 19 specific methods

```typescript
NotPendingTransition
HostTransitionContext
setCurrentUpdatePriority()
resolveUpdatePriority()
maySuspendCommit()
startSuspendingCommit()
```

These are new in React 19. React 19 overhauled how transitions and Suspense work internally, so the reconciler contract gained new methods. Most of them you can stub out (return `null`, `false`, or do nothing) unless you actually want to support those features. They exist because React 19 now has richer concepts around:

- **Transitions** — `startTransition()` support
- **Suspense on commit** — delaying commits until async resources are ready (like images loading)
- **Form instances** — React 19's new form handling

---

## The mental model in one sentence

> React Core figures out **what** changed. Your host config tells React **how** to apply those changes in your specific environment.

Every single method is React asking you a question at a specific moment in its lifecycle. You just have to answer correctly for your target environment.