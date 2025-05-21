/**
 * DomKit - A minimalist front-end renderer with component support
 * Version: v1.0.0
 */

const DomKit = (function () {
  const h = (tag, props = {}, children = []) => {
    // Validate tag
    if (tag === null || tag === undefined) {
      console.error("Tag cannot be null/undefined");
      tag = "div"; // Fallback or return null
    }

    // Filter out null/undefined children
    const filteredChildren = Array.isArray(children)
      ? children.filter((child) => child != null)
      : children != null
      ? [children]
      : [];

    return { tag, props, children: filteredChildren };
  };

  const isNodeChanged = (node1, node2) => {
    if (node1.props?.key !== node2.props?.key) return true;
    // Handle null cases first
    if (node1 === null || node2 === null) {
      return node1 !== node2; // If both null, they're equal; otherwise they're different
    }

    if (typeof node1 !== typeof node2) return true;

    if (typeof node1 === "string" || typeof node1 === "number")
      return node1 !== node2;

    // Additional check to make sure both are objects with a tag property
    if (!node1.tag || !node2.tag) return true;

    if (node1.tag !== node2.tag) return true;

    const n1Props = Object.keys(node1.props || {});
    const n2Props = Object.keys(node2.props || {});
    if (n1Props.length !== n2Props.length) return true;

    for (const name of n1Props) {
      if (name.startsWith("on")) continue;

      if (
        name === "style" &&
        typeof node1.props[name] === "object" &&
        typeof node2.props[name] === "object"
      ) {
        const s1Keys = Object.keys(node1.props[name]);
        const s2Keys = Object.keys(node2.props[name]);
        if (s1Keys.length !== s2Keys.length) return true;

        for (const key of s1Keys) {
          if (node1.props[name][key] !== node2.props[name][key]) return true;
        }
      } else if (node1.props[name] !== node2.props[name]) {
        return true;
      }
    }

    return false;
  };

  const updateProps = (element, newProps, oldProps) => {
    if (!element || !(element instanceof HTMLElement)) {
      console.error("Invalid element passed to updateProps");
      return;
    }

    if (newProps.ref && typeof newProps.ref === "function") {
      newProps.ref(element);
    }

    Object.keys(oldProps).forEach((name) => {
      if (
        name.startsWith("on") &&
        (!newProps[name] || oldProps[name] !== newProps[name])
      ) {
        const eventName = name.substring(2).toLowerCase();
        if (element._events && element._events[eventName]) {
          element.removeEventListener(eventName, element._events[eventName]);
          delete element._events[eventName];
        }
      }
    });

    Object.keys(newProps).forEach((name) => {
      if (!name.startsWith("on") && oldProps[name] === newProps[name]) return;

      if (name.startsWith("on")) {
        const eventName = name.substring(2).toLowerCase();

        if (!element._events) element._events = {};

        if (element._events[eventName]) {
          element.removeEventListener(eventName, element._events[eventName]);
        }

        element._events[eventName] = newProps[name];
        element.addEventListener(eventName, newProps[name]);
      } else if (name === "style" && typeof newProps[name] === "object") {
        // Style objects
        const newStyle = newProps[name];
        const oldStyle = oldProps[name] || {};

        // Remove old styles
        Object.keys(oldStyle).forEach((prop) => {
          if (!newStyle[prop]) element.style[prop] = "";
        });

        // Add new styles
        Object.keys(newStyle).forEach((prop) => {
          if (oldStyle[prop] !== newStyle[prop]) {
            element.style[prop] = newStyle[prop];
          }
        });
      } else if (name === "className") {
        // Class names
        element.setAttribute("class", newProps[name]);
      } else {
        // Regular attributes
        element.setAttribute(name, newProps[name]);
      }
    });

    // Remove attributes that are no longer present
    Object.keys(oldProps).forEach((name) => {
      if (!newProps[name] && !name.startsWith("on") && name !== "style") {
        element.removeAttribute(name);
      }
    });
  };

  // DOM diffing algorithm
  const updateElement = (parent, newNode, oldNode, index = 0) => {
    if (!parent || !(parent instanceof Node)) {
      console.error("Invalid parent node");
      return;
    }
    // Support for custom renderers (for focus retention)
    let postRenderCallback = null;
    if (newNode && typeof newNode === "object" && newNode._customRender) {
      postRenderCallback = newNode._customRender(oldNode);
    }

    // If old node doesn't exist, append new node
    if (!oldNode) {
      parent.appendChild(createDomElement(newNode));
      if (postRenderCallback) postRenderCallback();
      return;
    }

    // If new node doesn't exist, remove old node
    if (!newNode) {
      parent.removeChild(parent.childNodes[index]);
      return;
    }

    // If nodes are different, replace old with new
    if (isNodeChanged(newNode, oldNode)) {
      parent.replaceChild(createDomElement(newNode), parent.childNodes[index]);
      if (postRenderCallback) postRenderCallback();
      return;
    }

    // If it's a text node and not changed, we're done (handled by isNodeChanged)
    if (typeof newNode === "string" || typeof newNode === "number") {
      if (postRenderCallback) postRenderCallback();
      return;
    }

    // Update properties
    updateProps(
      parent.childNodes[index],
      newNode.props || {},
      oldNode.props || {}
    );

    // Recursively update children
    const newLength = newNode.children ? newNode.children.length : 0;
    const oldLength = oldNode.children ? oldNode.children.length : 0;

    for (let i = 0; i < Math.max(newLength, oldLength); i++) {
      updateElement(
        parent.childNodes[index],
        newNode.children && i < newLength ? newNode.children[i] : null,
        oldNode.children && i < oldLength ? oldNode.children[i] : null,
        i
      );
    }

    // Run post-render callback (for focus retention)
    if (postRenderCallback) postRenderCallback();
  };

  // Create DOM element from virtual node, add support for refs and custom renderers
  const createDomElement = (vnode) => {
    // Handle null/undefined cases
    if (vnode === null || vnode === undefined) {
      return document.createTextNode("");
    }

    // Handle text nodes
    if (typeof vnode === "string" || typeof vnode === "number") {
      return document.createTextNode(vnode);
    }

    // Handle component references
    if (typeof vnode.tag === "function") {
      const componentResult = vnode.tag(vnode.props || {});
      return createDomElement(componentResult);
    }

    // Regular elements
    const element = document.createElement(vnode.tag);

    // Set properties
    if (vnode.props) {
      updateProps(element, vnode.props, {});

      // Handle ref property
      if (vnode.props.ref && typeof vnode.props.ref === "function") {
        vnode.props.ref(element);
      }
    }

    // Ensure children is an array and append children
    const children = Array.isArray(vnode.children)
      ? vnode.children
      : vnode.children
      ? [vnode.children]
      : [];

    children.forEach((child) => {
      if (child !== null && child !== undefined) {
        element.appendChild(createDomElement(child));
      }
    });

    return element;
  };

  // Render virtual DOM to real DOM with diffing
  const render = (vnode, container) => {
    if (!container) {
      console.error("Render failed: no container provided");
      return;
    }

    if (typeof container === "string") {
      const domContainer = document.querySelector(container);
      if (!domContainer) {
        console.error(`Container not found: ${container}`);
        return; // Exit early to prevent null errors
      }
      container = domContainer;
    }

    // Safe Mutation Observer initialization
    if (typeof MutationObserver !== 'undefined' && !container._observer) {
      try {
        container._observer = new MutationObserver(() => {
          container._externallyModified = true;
        });
        
        container._observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });
      } catch (error) {
        console.warn('MutationObserver setup failed:', error);
      }
    }

    // Force reset if we detect external changes
    if (container._externallyModified) {
      container._vdom = null;
      container._externallyModified = false;
    }

    // Render with diffing or create from scratch
    if (!container._vdom) {
      // Clear container (using the more efficient method)
      container.innerHTML = '';
      container.appendChild(createDomElement(vnode));
      container._vdom = vnode;
    } else {
      // Update existing DOM using diffing
      updateElement(container, vnode, container._vdom, 0);
      container._vdom = vnode;
    }
  };

  // Create a helper function to standardize the pattern
  const createApp = (renderFn, initialState, containerSelector) => {
    const container =
      typeof containerSelector === "string"
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }

    const state = DomKit.createState(initialState);

    const update = () => {
      const vnode = renderFn(state.getState(), state.setState.bind(state));
      DomKit.render(vnode, container);
    };

    // Subscribe to state changes
    state.subscribe(update);

    // Initial render
    update();

    return {
      getState: state.getState,
      setState: state.setState,
    };
  };

  // Simple component factory
  const createComponent = (template) => {
    return (props) => {
      try {
        return template(props);
      } catch (error) {
        console.error("Component render error:", error);
        return h("div", { className: "error" }, ["Component error"]);
      }
    };
  };

  // Updated inject function
  const inject = (vnode, target, position = "replace") => {
    // Handle string selectors
    if (typeof target === "string") {
      target = document.querySelector(target);
    }

    // Ensure we have a proper vnode (wrap component functions)
    const nodeToInject = typeof vnode === "function" ? h(vnode) : vnode;

    // Create DOM from vnode
    const element = createDomElement(nodeToInject);

    // Initialize injected tracking if needed
    if (!target._injected) target._injected = [];

    // Perform the injection based on position
    switch (position) {
      case "append":
        target.appendChild(element);
        target._injected.push(nodeToInject); // Store at end
        break;

      case "prepend":
        target.insertBefore(element, target.firstChild);
        target._injected.unshift(nodeToInject); // Store at beginning
        break;

      case "replace":
      default:
        // Clear the target
        while (target.firstChild) {
          target.removeChild(target.firstChild);
        }
        target.appendChild(element);
        target._injected = [nodeToInject]; // Replace all
        break;
    }

    return element;
  };

  // Updated updateInjected function
  const updateInjected = (vnode, target, index = 0) => {
    // Handle string selectors
    if (typeof target === "string") {
      target = document.querySelector(target);
    }

    // Ensure we have a proper vnode
    const newNode = typeof vnode === "function" ? h(vnode) : vnode;

    if (!target._injected || !target._injected[index]) {
      // If not previously injected, just inject it
      return inject(newNode, target, "append");
    }

    // Get the old vdom
    const oldNode = target._injected[index];

     // At least validate if the new node is different
    if (oldNode && !isNodeChanged(newNode, oldNode)) {
      return target.children[index];  // No changes needed
    }

    // Get the corresponding DOM element
    const domElement = target.children[index];

    if (!domElement) {
      return inject(newNode, target, "append");
    }

    // Create a temporary container for the new element
    const tempContainer = document.createElement("div");
    const newElement = createDomElement(newNode);
    tempContainer.appendChild(newElement);

    // Replace the old element with the new one
    target.replaceChild(newElement, domElement);

    // Update the stored vdom
    target._injected[index] = newNode;

    return newElement;
  };

  // State management system for DomKit
  const createState = (initialState = {}) => {
    let updateQueue = [];
    let state = { ...initialState };
    const listeners = [];

    const processQueue = () => {
      if (updateQueue.length > 0) {
        state = { ...state, ...Object.assign({}, ...updateQueue) };
        updateQueue = [];
        listeners.forEach((listener) => listener(state));
      }
    };

    const debouncedSetState = (newState) => {
      updateQueue.push(newState);
      requestAnimationFrame(processQueue);
    };

    const getState = () => ({ ...state });

    const setState = (newState) => {
      if (typeof newState !== "object" || newState === null) {
        console.error("State must be an object");
        return;
      }
      // Merge the new state with the existing state
      state = { ...state, ...newState };

      // Notify all listeners
      listeners.forEach((listener) => listener(state));
    };

    const subscribe = (listener) => {
      listeners.push(listener);

      // Return unsubscribe function
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    };

    const cleanup = () => {
      listeners.length = 0;
    };

    return {
      getState,
      setState: debouncedSetState,
      subscribe,
      cleanup, // Expose cleanup method
    };
  };

  // Component with state hook
  const createStatefulComponent = (renderFn, initialState = {}) => {
    const stateManager = createState(initialState);
    let lastRenderedNode = null;

    const component = (props) => {
      const { getState, setState } = stateManager; // subscribe removed 

      // Provide state management capabilities to the render function
      const result = renderFn({
        ...props,
        state: getState(),
        setState,
      });

      lastRenderedNode = result;
      return result;
    };

    // Attach state management to the component
    component.getState = stateManager.getState;
    component.setState = stateManager.setState;
    component.subscribe = stateManager.subscribe;
    component.forceUpdate = (container) => {
      if (container && lastRenderedNode) {
        DomKit.render(lastRenderedNode, container);
      }
    };

    return component;
  };

  // Helper for managing component with automatic re-rendering
  const useState = (initialState, renderFn, container) => {
    const state = createState(initialState);
    let currentVNode = null;

    // Initial render
    const render = () => {
      currentVNode = renderFn(state.getState(), state.setState);
      DomKit.render(currentVNode, container);
    };

    // Subscribe to state changes
    state.subscribe(render);

    // Initial render
    render();

    return state;
  };

  // Input field component with focus retention
  const createInputField = (props = {}) => {
    // Validate props
    if (props.value === undefined) props.value = "";
    if (typeof props.onChange !== "function") props.onChange = () => {};
    const { value, onChange, ...restProps } = props;
    let currentElement = null;

    const handleChange = (e) => {
      if (onChange) onChange(e.target.value, e);
    };

    const vnode = DomKit.h("input", {
      ...restProps,
      value: value || "",
      onChange: handleChange,
      ref: (el) => {
        currentElement = el;
      },
    });

    // Custom rendering function to preserve focus
    vnode._customRender = () => {
      const wasFocused = document.activeElement === currentElement;
      const selection = {
        start: currentElement ? currentElement.selectionStart : 0,
        end: currentElement ? currentElement.selectionEnd : 0,
      };

      // Let the normal render happen
      // Return value indicates if we need to restore focus
      return () => {
        if (wasFocused && currentElement) {
          currentElement.focus();
          currentElement.setSelectionRange(selection.start, selection.end);
        }
      };
    };

    return vnode;
  };

  const memo = (component, shouldUpdate) => {
    if (typeof component !== "function") {
      console.error("DomKit.memo: First argument must be a component function");
      return component;
    }

    let lastProps = null;
    let lastResult = null;

    return (props = {}) => {
      // Always re-render if no comparison function provided
      const shouldReRender = !shouldUpdate
        ? true
        : shouldUpdate(lastProps, props);

      if (!lastResult || shouldReRender) {
        try {
          lastResult = component(props);
          lastProps = props;
        } catch (error) {
          console.error("DomKit.memo: Component render error:", error);
          return h("div", { className: "error" }, ["Component error"]);
        }
      }

      return lastResult;
    };
  };

  // Public API
  return {
    h,
    render,
    createComponent,
    createApp,
    // State management
    createState,
    createStatefulComponent,
    useState,
    createInputField,
    memo,
    // Utility methods
    mount(component, container) {
      render(h(component), container);
    },
    // Updated injection methods
    inject(vnode, target, position) {
      return inject(
        typeof vnode === "function" ? h(vnode) : vnode,
        target,
        position
      );
    },
    updateInjected(vnode, target, index) {
      return updateInjected(
        typeof vnode === "function" ? h(vnode) : vnode,
        target,
        index
      );
    },
    append(component, container) {
      return inject(
        typeof component === "function" ? h(component) : component,
        container,
        "append"
      );
    },
    prepend(component, container) {
      return inject(
        typeof component === "function" ? h(component) : component,
        container,
        "prepend"
      );
    },
  };
})();