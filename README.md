# DomKit

DomKit is a lightweight, minimalist front-end renderer with virtual DOM and component support. It provides an elegant API for building dynamic web applications without the overhead of larger frameworks.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- **Virtual DOM** with efficient diffing algorithm
- **Component-based architecture** for reusable UI elements
- **State management** with built-in state hooks
- **Declarative rendering** similar to modern UI libraries
- **Small footprint** with zero dependencies
- **DOM injection utilities** for flexible integration
- **Simple API** that's easy to learn and use
- **Focus retention** for form inputs during re-renders
- **Memoization** for performance optimization
- **Custom renderers** for special cases


## Installation

### Option 1: Direct script include

```html
<script src="path/to/DomKit.js"></script>
```

### Option 2: ES Module import

```javascript
import DomKit from 'path/to/DomKit.js';
```

## Basic Usage

```javascript
// Create elements with the hyperscript function
const { h, render } = DomKit;

// Create a simple virtual DOM structure
const app = h('div', { className: 'container' }, [
  h('h1', {}, ['Hello, DomKit!']),
  h('p', {}, ['A lightweight front-end renderer']),
  h('button', { 
    className: 'btn', 
    onClick: () => alert('Button clicked!') 
  }, ['Click me'])
]);

// Render to the DOM
render(app, '#app');
```

## Creating Components

DomKit supports reusable components:

```javascript
const { h, createComponent, render } = DomKit;

// Create a Button component
const Button = createComponent(({ text, onClick }) => {
  return h('button', { 
    className: 'custom-button',
    onClick
  }, [text]);
});

// Create a Header component
const Header = createComponent(({ title }) => {
  return h('header', { className: 'app-header' }, [
    h('h1', {}, [title])
  ]);
});

// Use components in your app
const app = h('div', { className: 'app' }, [
  h(Header, { title: 'My DomKit App' }),
  h('main', {}, [
    h('p', {}, ['Welcome to my app built with DomKit']),
    h(Button, { 
      text: 'Click Me', 
      onClick: () => console.log('Button clicked!') 
    })
  ])
]);

// Render the app
render(app, '#app');
```

## State Management

DomKit provides several ways to manage component state:


### Using createStatefulComponent

```javascript
const Counter = createStatefulComponent(({ state, setState }) => {
  return h('div', {}, [
    h('p', {}, [`Count: ${state.count || 0}`]),
    h('button', {
      onClick: () => setState({ count: (state.count || 0) + 1 })
    }, ['Increment'])
  ]);
}, { count: 0 });

// Use the component
render(h(Counter), '#app');
```

### Using useState Hook

```javascript
const CounterApp = () => {
  const state = useState({ count: 0 }, (state, setState) => {
    return h('div', {}, [
      h('p', {}, [`Count: ${state.count}`]),
      h('button', {
        onClick: () => setState({ count: state.count + 1 })
      }, ['Increment'])
    ]);
  }, '#app');
  
  return h('div', {}, ['Counter will render below']);
};
```

### Using createApp Pattern

```javascript
const app = createApp((state, setState) => {
  return h('div', {}, [
    h('h1', {}, ['Counter App']),
    h('p', {}, [`Current count: ${state.count}`]),
    h('button', {
      onClick: () => setState({ count: state.count + 1 })
    }, ['Increment'])
  ]);
}, { count: 0 }, '#app');
```


## DOM Injection Methods

DomKit provides several ways to inject components into the DOM:

```javascript
const { h, inject, append, prepend, updateInjected } = DomKit;

// Replace the content of a container
inject(h('div', {}, ['New content']), '#container');

// Append to a container
append(h('p', {}, ['Appended content']), '#container');

// Prepend to a container
prepend(h('p', {}, ['Prepended content']), '#container');

// Update an injected component
updateInjected(h('div', {}, ['Updated content']), '#container', 0);
```

## API Reference

### Core Functions

#### `h(tag, props, children)`
Creates a virtual DOM node.

- `tag`: String HTML tag name or component function
- `props`: Object containing element properties and event handlers
- `children`: Array of child elements (virtual nodes or strings)

#### `render(vnode, container)`
Renders a virtual DOM tree to a DOM container with efficient diffing.

- `vnode`: Virtual DOM node to render
- `container`: DOM element or CSS selector to render into

#### `createComponent(template)`
Creates a reusable component from a template function.

- `template`: Function that returns a virtual DOM structure


### State Management

#### `createState(initialState)`
Creates a state management object.

- `initialState`: Initial state object

#### `createStatefulComponent(renderFn, initialState)`
Creates a component with built-in state.

- `renderFn`: Function that returns virtual DOM
- `initialState`: Initial state object

#### `useState(initialState, renderFn, container)`
Hook-style state management.

- `initialState`: Initial state object
- `renderFn`: Function that returns virtual DOM
- `container`: Target container for rendering

#### `createApp(renderFn, initialState, containerSelector)`
Creates an application with automatic state management.

- `renderFn`: Function that returns virtual DOM
- `initialState`: Initial state object
- `containerSelector`: Target container selector


### DOM Injection Methods

#### `inject(vnode, target, position)`
Injects a virtual node into the DOM.

- `vnode`: Virtual DOM node to inject
- `target`: DOM element or CSS selector
- `position`: "replace" (default), "append", or "prepend"

#### `append(vnode, target)`
Appends a virtual node to a target container.

- `vnode`: Virtual DOM node to append
- `target`: DOM element or CSS selector

#### `prepend(vnode, target)`
Prepends a virtual node to a target container.

- `vnode`: Virtual DOM node to prepend
- `target`: DOM element or CSS selector

#### `updateInjected(vnode, target, index)`
Updates a previously injected component.

- `vnode`: New virtual DOM node
- `target`: DOM element or CSS selector where component was injected
- `index`: Index of the component to update (default: 0)

#### `mount(component, container)`
Convenience method to mount a component function to a container.

- `component`: Component function to mount
- `container`: DOM element or CSS selector


## Advanced Features

### Event Handling

DomKit supports DOM event handling using `on` prefixed properties:

```javascript
h('button', {
  onClick: (e) => console.log('Clicked!', e),
  onMouseover: (e) => console.log('Mouse over!', e)
}, ['Click me'])
```

### Style Objects

Use style objects for inline styles:

```javascript
h('div', {
  style: {
    color: 'red',
    fontSize: '16px',
    backgroundColor: '#f0f0f0'
  }
}, ['Styled text'])
```

### Conditional Rendering

```javascript
const ConditionalComponent = createComponent(({ isVisible, content }) => {
  if (!isVisible) return null;
  return h('div', {}, [content]);
});

// Usage
h(ConditionalComponent, { 
  isVisible: true, 
  content: 'This will be visible' 
})
```

### Lists and Iterations

```javascript
const List = createComponent(({ items }) => {
  return h('ul', {}, 
    items.map(item => h('li', { key: item.id }, [item.text]))
  );
});

// Usage
h(List, { 
  items: [
    { id: 1, text: 'Item 1' },
    { id: 2, text: 'Item 2' },
    { id: 3, text: 'Item 3' }
  ]
})
```

### Lists and Iterations

```javascript
const InputComponent = createComponent(({ value, onChange }) => {
  return createInputField({
    value,
    onChange,
    placeholder: 'Type something...'
  });
});
```

### Memoization for Performance

```javascript
const ExpensiveComponent = memo(({ data }) => {
  // Expensive calculations here
  return h('div', {}, [data.result]);
}, (prevProps, nextProps) => {
  // Only re-render if data has changed
  return prevProps.data.id !== nextProps.data.id;
});
```

### Custom Renderers

```javascript 
const CustomComponent = (props) => {
  const vnode = h('div', {}, ['Custom content']);
  
  vnode._customRender = (oldNode) => {
    // Custom rendering logic
    return () => {
      // Post-render logic
    };
  };
  
  return vnode;
};
```

### Refs

```javascript
const ComponentWithRef = createComponent(() => {
  let inputRef = null;
  
  return h('div', {}, [
    h('input', { 
      ref: (el) => { inputRef = el; },
      type: 'text'
    }),
    h('button', {
      onClick: () => inputRef.focus()
    }, ['Focus Input'])
  ]);
});
```


## Performance Considerations

- DomKit uses an efficient diffing algorithm to minimize DOM operations
- Use unique `key` properties when rendering lists for better performance
- Components are re-rendered when their parent re-renders, so structure your component tree accordingly
- Use memo for expensive components to prevent unnecessary re-renders
- Batch state updates with setState for better performance
- Consider using createInputField for form inputs to maintain focus state

## Browser Compatibility

DomKit works in all modern browsers that support ES5 features and DOM manipulation. For older browsers, consider using appropriate polyfills.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
