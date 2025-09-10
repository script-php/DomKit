/**
 * DomKit - A minimalist front-end renderer with component support
 * Version: v1.1.0
 */

const DomKit = (function () {

  // Component loader settings
  const componentCache = new Map();
  const componentRegistry = new Map();
  const loadingComponents = new Map();
  let COMPONENT_BASE_URL = '';
  let COMPONENT_PATH = '/components/';

  // Settings function
  function configureComponentLoader(settings = {}) {
    if (settings.domain) {
      COMPONENT_BASE_URL = settings.domain;
    }

    if (settings.componentPath) {
      COMPONENT_PATH = settings.componentPath;
    }

    if (settings.components) {
      Object.entries(settings.components).forEach(([name, path]) => {
        registerComponent(name, path);
      });
    }

    console.log(`Component loader configured: ${COMPONENT_BASE_URL}${COMPONENT_PATH}`);
  }

  // Helper to find component names in vnode tree (ADDED 10.09.2024)
  function findComponentNames(vnode) {
    const names = new Set();

    function traverse(node) {
      if (!node) return;

      // Look for component placeholders
      if (node.props && node.props['data-component-name']) {
        const componentName = node.props['data-component-name'];
        if (!componentCache.has(componentName)) {
          names.add(componentName);
        }
      }

      // Also check for registered component names that aren't loaded yet
      if (typeof node.tag === 'string' && componentRegistry.has(node.tag) && !componentCache.has(node.tag)) {
        names.add(node.tag);
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    }

    traverse(vnode);
    return Array.from(names);
  }

  function recreateVNodeWithComponents(vnode) {
    if (!vnode) return vnode;

    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return vnode;
    }

    // If this is a component placeholder, replace it with the actual component
    if (vnode.props && vnode.props['data-component-name']) {
      const componentName = vnode.props['data-component-name'];
      if (componentCache.has(componentName)) {
        const component = componentCache.get(componentName);
        const props = JSON.parse(vnode.props['data-component-props'] || '{}');

        // Restore event handlers from the placeholder
        if (vnode._eventHandlers) {
          Object.assign(props, vnode._eventHandlers);
        }

        const children = JSON.parse(vnode.props['data-component-children'] || '[]');
        return h(component, props, children);
      }
    }

    // Process children recursively
    const newChildren = vnode.children
      ? vnode.children.map(recreateVNodeWithComponents)
      : [];

    return {
      tag: vnode.tag,
      props: { ...vnode.props },
      children: newChildren
    };
  }

  function unloadComponent(name) {
    if (componentCache.has(name)) {
      componentCache.delete(name);
      console.log(`Component unloaded: ${name}`);
    }
    return true;
  }

  function unloadAllComponents() {
    const names = Array.from(componentCache.keys());
    names.forEach(name => unloadComponent(name));
    return names;
  }

  function cleanupComponentLoader() {
    unloadAllComponents();
    componentRegistry.clear();
    loadingComponents.clear();
  }

  function loadComponent(name) {
    if (componentCache.has(name)) {
      return Promise.resolve(componentCache.get(name));
    }

    // Check if component is already being loaded
    if (loadingComponents.has(name)) {
      return loadingComponents.get(name);
    }

    // Check if component is registered
    if (!componentRegistry.has(name)) {
      return Promise.reject(new Error(`Component "${name}" is not registered.`));
    }

    const loadPromise = new Promise((resolve, reject) => {
      const componentPath = componentRegistry.get(name);
      const scriptUrl = `${COMPONENT_BASE_URL}${COMPONENT_PATH}${componentPath}`;

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => {
        if (window.__domkitComponents && window.__domkitComponents[name]) {
          const component = window.__domkitComponents[name];
          componentCache.set(name, component);
          loadingComponents.delete(name);
          resolve(component);
        } else {
          loadingComponents.delete(name);
          reject(new Error(`Component "${name}" was not properly exported.`));
        }
      };
      script.onerror = () => {
        loadingComponents.delete(name);
        reject(new Error(`Failed to load component: ${name} from ${scriptUrl}`));
      };
      document.head.appendChild(script);
    });

    loadingComponents.set(name, loadPromise);
    return loadPromise;
  }

  function isComponentLoaded(name) {
    return componentCache.has(name);
  }

  function getComponent(name) {
    if (!isComponentLoaded(name)) {
      throw new Error(`Component "${name}" is not loaded. Call loadComponent() first.`);
    }
    return componentCache.get(name);
  }

  function preloadComponents(names) {
    return Promise.all(names.map(name => loadComponent(name)));
  }

  function registerComponent(name, path) {
    componentRegistry.set(name, path);
    return true;
  }

  function getComponentConfig() {
    return {
      domain: COMPONENT_BASE_URL,
      path: COMPONENT_PATH,
      registeredComponents: Array.from(componentRegistry.entries()),
      loadedComponents: Array.from(componentCache.keys())
    };
  }

  // Enhanced h function to handle component loading (MODIFIED 10.09.2024)
  const h = (tag, props = {}, children = []) => {
    // If it's a function (already loaded component), use it directly
    if (typeof tag === 'function') {
      try {
        return tag({ ...props, children });
      } catch (error) {
        console.error("Component render error:", error);
        return h("div", { className: "error" }, ["Component error"]);
      }
    }

    // If it's a registered component name, handle it
    if (typeof tag === 'string' && componentRegistry.has(tag)) {
      if (componentCache.has(tag)) {
        // Component is already loaded, use it
        const component = componentCache.get(tag);
        return h(component, props, children);
      } else {
        // Extract event handlers before JSON serialization
        const eventHandlers = {};
        const serializableProps = {};

        Object.keys(props).forEach(key => {
          if (key.startsWith('on') && typeof props[key] === 'function') {
            eventHandlers[key] = props[key];
          } else {
            serializableProps[key] = props[key];
          }
        });

        // Component needs to be loaded - return a placeholder
        const placeholder = {
          tag: 'div',
          props: {
            className: 'component-loading',
            'data-component-name': tag,
            'data-component-props': JSON.stringify(serializableProps),
            'data-component-children': JSON.stringify(children),
            'data-component-events': JSON.stringify(Object.keys(eventHandlers))
          },
          children: [`Loading ${tag}...`],
          _eventHandlers: eventHandlers // Store event handlers separately
        };

        return placeholder;
      }
    }

    // Original h function logic for HTML elements
    if (tag === null || tag === undefined) {
      console.error("Tag cannot be null/undefined");
      tag = "div";
    }

    const filteredChildren = Array.isArray(children)
      ? children.filter((child) => child != null)
      : children != null
        ? [children]
        : [];

    return { tag, props, children: filteredChildren };
  };

  // Check if two nodes are different
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
    try {
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

      // Handle SVG elements
      let element;
      if (vnode.props && vnode.props.xmlns) {
        element = document.createElementNS(vnode.props.xmlns, vnode.tag);
      } else {
        element = document.createElement(vnode.tag);
      }

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
    } catch (error) {
      console.error('Failed to create DOM element:', error, vnode);
      return document.createTextNode('');
    }
  };

  // Enhanced render function to handle component loading (MODIFIED)
  const render = async (vnode, container) => {
    if (!container) {
      console.error("Render failed: no container provided");
      return;
    }

    if (typeof container === "string") {
      const domContainer = document.querySelector(container);
      if (!domContainer) {
        console.error(`Container not found: ${container}`);
        return;
      }
      container = domContainer;
    }

    // Check if vnode uses any components that need loading
    const componentNames = findComponentNames(vnode);

    if (componentNames.length > 0) {
      try {
        // Load all needed components FIRST
        await Promise.all(componentNames.map(name => loadComponent(name)));

        // AFTER components are loaded, recreate the vnode with actual components
        vnode = recreateVNodeWithComponents(vnode);

        // Now proceed with normal rendering
        proceedWithRendering(vnode, container);

      } catch (error) {
        console.error('Failed to load components:', error);
        container.innerHTML = `<div class="error">Failed to load components: ${error.message}</div>`;
      }
    } else {
      // No components need loading, proceed normally
      proceedWithRendering(vnode, container);
    }
  };

  function proceedWithRendering(vnode, container) {
    // Safe Mutation Observer initialization with optimized settings
    if (typeof MutationObserver !== 'undefined' && !container._observer) {
      try {
        container._observer = new MutationObserver(() => {
          container._externallyModified = true;
        });

        container._observer.observe(container, {
          childList: true,
          subtree: false, // Only observe direct children
          attributes: false,
          characterData: false
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
      // Clear container efficiently
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(createDomElement(vnode));
      container._vdom = vnode;
    } else {
      // Update existing DOM using diffing
      updateElement(container, vnode, container._vdom, 0);
      container._vdom = vnode;
    }

    // NEW: Components should now be loaded, so config should show them
    const config = DomKit.getComponentConfig();
    console.log('Components after render:', config.loadedComponents);
  }

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
    // Component loader methods (ADDED)
    configureComponentLoader,
    loadComponent,
    preloadComponents,
    isComponentLoaded,
    getComponent,
    registerComponent,
    getComponentConfig,
    unloadComponent,
    unloadAllComponents,
    cleanupComponentLoader,
    isComponentRegistered(name) {
      return componentRegistry.has(name);
    },
    getLoadingComponents() {
      return Array.from(loadingComponents.keys());
    },
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

// Component export helper (ADDED)
window.registerDomKitComponent = function (name, component) {
  if (!window.__domkitComponents) {
    window.__domkitComponents = {};
  }
  window.__domkitComponents[name] = component;
  console.log(`Component registered: ${name}`);
};