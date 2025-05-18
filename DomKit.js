/**
 * DomKit - A minimalist front-end renderer with component support
 * Version: v1.0.0
 */

const DomKit = (function () {
  const h = (tag, props = {}, children = []) => {
    return { tag, props, children };
  };

  const isNodeChanged = (node1, node2) => {
    if (typeof node1 !== typeof node2) return true;

    if (typeof node1 === "string" || typeof node1 === "number")
      return node1 !== node2;

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
    // If old node doesn't exist, append new node
    if (!oldNode) {
      parent.appendChild(createDomElement(newNode));
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
      return;
    }

    // If it's a text node and not changed, we're done (handled by isNodeChanged)
    if (typeof newNode === "string" || typeof newNode === "number") {
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
  };

  // Create DOM element from virtual node
  const createDomElement = (vnode) => {
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
    }

    // Ensure children is an array and append children
    const children = Array.isArray(vnode.children) ? vnode.children : 
                   (vnode.children ? [vnode.children] : []);
    
    children.forEach((child) => {
        if (child !== null && child !== undefined) {
            element.appendChild(createDomElement(child));
        }
    });

    return element;
};

  // Render virtual DOM to real DOM with diffing
  const render = (vnode, container) => {
    // Handle string selectors
    if (typeof container === "string") {
      container = document.querySelector(container);
    }

    // First render or full refresh
    if (!container._vdom) {
      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Create new DOM tree
      container.appendChild(createDomElement(vnode));
      container._vdom = vnode;
    } else {
      // Update existing DOM using diffing
      updateElement(container, vnode, container._vdom, 0);
      container._vdom = vnode;
    }
  };

  // Simple component factory
  const createComponent = (template) => {
    return (props) => template(props);
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

  // Public API
  return {
    h,
    render,
    createComponent,
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
