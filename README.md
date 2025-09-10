# DomKit

DomKit is a lightweight, minimalist front-end renderer with virtual DOM, dynamic component loading, and comprehensive state management. It provides an elegant API for building dynamic web applications without the overhead of larger frameworks.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- **Virtual DOM** with efficient diffing algorithm and key-based optimization
- **Dynamic Component Loading** with intelligent caching and lazy loading
- **Component-based architecture** for reusable UI elements
- **State management** with built-in state hooks and automatic re-rendering
- **Declarative rendering** similar to modern UI libraries
- **Small footprint** with zero dependencies
- **DOM injection utilities** for flexible integration
- **Simple API** that's easy to learn and use
- **Focus retention** for form inputs during re-renders
- **Memoization** for performance optimization
- **Custom renderers** for special cases
- **MutationObserver integration** for external DOM change detection
- **SVG support** built-in
- **Event handler preservation** during component loading
- **Component registry system** with cleanup utilities

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

## Dynamic Component Loading

DomKit's most powerful feature is its ability to load components dynamically from external files:

### Component Configuration

```javascript
// Configure the component loader
DomKit.configureComponentLoader({
  domain: 'https://your-domain.com',
  componentPath: '/components/',
  components: {
    'MyButton': 'my-button.js',
    'UserCard': 'user-card.js',
    'DataTable': 'data-table.js'
  }
});
```

### Creating External Components

Create a component file (e.g., `my-button.js`):

```javascript
// my-button.js
const MyButton = DomKit.createComponent(({ text, onClick, variant = 'primary' }) => {
  return DomKit.h('button', {
    className: `btn btn-${variant}`,
    onClick
  }, [text]);
});

// Register the component
window.registerDomKitComponent('MyButton', MyButton);
```

### Using Dynamic Components

```javascript
// Components will be loaded automatically when needed
const app = h('div', {}, [
  h('MyButton', { 
    text: 'Click Me', 
    variant: 'success',
    onClick: () => console.log('Clicked!') 
  }),
  h('UserCard', { userId: 123 })
]);

// DomKit will automatically load MyButton and UserCard components
render(app, '#app');
```

### Component Loading API

```javascript
// Check if a component is loaded
if (DomKit.isComponentLoaded('MyButton')) {
  console.log('MyButton is ready');
}

// Preload components
await DomKit.preloadComponents(['MyButton', 'UserCard']);

// Load a single component
await DomKit.loadComponent('DataTable');

// Get loaded component
const MyButton = DomKit.getComponent('MyButton');

// Check registration status
if (DomKit.isComponentRegistered('MyButton')) {
  console.log('MyButton is registered');
}

// Get component configuration
const config = DomKit.getComponentConfig();
console.log('Loaded components:', config.loadedComponents);

// Cleanup
DomKit.unloadComponent('MyButton');
DomKit.unloadAllComponents();
DomKit.cleanupComponentLoader();
```

## Creating Components

DomKit supports several ways to create reusable components:

### Basic Components

```javascript
const { h, createComponent, render } = DomKit;

// Create a Button component
const Button = createComponent(({ text, onClick, variant = 'primary' }) => {
  return h('button', { 
    className: `btn btn-${variant}`,
    onClick
  }, [text]);
});

// Create a Header component
const Header = createComponent(({ title, subtitle }) => {
  return h('header', { className: 'app-header' }, [
    h('h1', {}, [title]),
    subtitle && h('p', { className: 'subtitle' }, [subtitle])
  ]);
});

// Use components in your app
const app = h('div', { className: 'app' }, [
  h(Header, { 
    title: 'My DomKit App', 
    subtitle: 'Built with dynamic components' 
  }),
  h('main', {}, [
    h('p', {}, ['Welcome to my app built with DomKit']),
    h(Button, { 
      text: 'Primary Button', 
      variant: 'primary',
      onClick: () => console.log('Primary clicked!') 
    }),
    h(Button, { 
      text: 'Success Button', 
      variant: 'success',
      onClick: () => console.log('Success clicked!') 
    })
  ])
]);

// Render the app
render(app, '#app');
```

### Stateful Components

```javascript
const Counter = createStatefulComponent(({ state, setState, initialValue = 0 }) => {
  // Initialize count if not set
  if (state.count === undefined) {
    setState({ count: initialValue });
  }

  return h('div', { className: 'counter' }, [
    h('h3', {}, ['Counter Component']),
    h('p', {}, [`Count: ${state.count || 0}`]),
    h('div', { className: 'counter-buttons' }, [
      h('button', {
        onClick: () => setState({ count: (state.count || 0) - 1 })
      }, ['Decrement']),
      h('button', {
        onClick: () => setState({ count: (state.count || 0) + 1 })
      }, ['Increment']),
      h('button', {
        onClick: () => setState({ count: initialValue })
      }, ['Reset'])
    ])
  ]);
}, { count: 0 });

// Use the stateful component
render(h(Counter, { initialValue: 5 }), '#app');
```

## State Management

DomKit provides comprehensive state management options:

### Using createState

```javascript
const state = DomKit.createState({ 
  count: 0, 
  user: { name: 'John', email: 'john@example.com' } 
});

// Subscribe to state changes
const unsubscribe = state.subscribe((newState) => {
  console.log('State updated:', newState);
  // Re-render your app here
});

// Update state (batched and debounced)
state.setState({ count: 5 });
state.setState({ user: { ...state.getState().user, name: 'Jane' } });

// Get current state
const currentState = state.getState();

// Cleanup when done
unsubscribe();
state.cleanup();
```

### Using createApp Pattern

```javascript
const app = createApp((state, setState) => {
  const handleIncrement = () => {
    setState({ count: state.count + 1 });
  };

  const handleReset = () => {
    setState({ count: 0, lastReset: new Date().toISOString() });
  };

  return h('div', { className: 'app' }, [
    h('h1', {}, ['Counter App']),
    h('p', {}, [`Current count: ${state.count}`]),
    state.lastReset && h('p', { className: 'reset-info' }, [
      `Last reset: ${new Date(state.lastReset).toLocaleString()}`
    ]),
    h('div', { className: 'buttons' }, [
      h('button', { onClick: handleIncrement }, ['Increment']),
      h('button', { onClick: handleReset }, ['Reset'])
    ])
  ]);
}, { count: 0 }, '#app');

// App automatically handles state and re-rendering
// Access state management if needed
console.log('Current state:', app.getState());
app.setState({ count: 10 });
```

### Using useState Hook

```javascript
const initializeApp = () => {
  useState(
    { count: 0, theme: 'light' }, 
    (state, setState) => {
      return h('div', { 
        className: `app theme-${state.theme}` 
      }, [
        h('h1', {}, ['useState Example']),
        h('p', {}, [`Count: ${state.count}`]),
        h('button', {
          onClick: () => setState({ count: state.count + 1 })
        }, ['Increment']),
        h('button', {
          onClick: () => setState({ 
            theme: state.theme === 'light' ? 'dark' : 'light' 
          })
        }, [`Switch to ${state.theme === 'light' ? 'dark' : 'light'} theme`])
      ]);
    }, 
    '#app'
  );
};

// Initialize the app
initializeApp();
```

## DOM Injection Methods

DomKit provides several ways to inject components into existing DOM structures:

```javascript
const { h, inject, append, prepend, updateInjected } = DomKit;

// Replace the content of a container
inject(h('div', { className: 'new-content' }, ['Replaced content']), '#container');

// Append to a container
append(h('p', { className: 'appended' }, ['Appended content']), '#container');

// Prepend to a container
prepend(h('p', { className: 'prepended' }, ['Prepended content']), '#container');

// Update a previously injected component
const newContent = h('div', { className: 'updated' }, ['Updated content']);
updateInjected(newContent, '#container', 0);

// Mount a component directly
const MyComponent = createComponent(() => h('div', {}, ['Mounted component']));
DomKit.mount(MyComponent, '#mount-point');
```

## Form Handling with Focus Retention

DomKit includes special handling for form inputs to maintain focus and cursor position:

```javascript
const FormComponent = createStatefulComponent(({ state, setState }) => {
  const handleInputChange = (value) => {
    setState({ inputValue: value });
  };

  const handleTextareaChange = (value) => {
    setState({ textareaValue: value });
  };

  return h('form', { className: 'form' }, [
    h('h3', {}, ['Form with Focus Retention']),
    
    // Input field with focus retention
    DomKit.createInputField({
      type: 'text',
      placeholder: 'Type something...',
      value: state.inputValue || '',
      onChange: handleInputChange,
      className: 'form-input'
    }),
    
    // Regular textarea (focus retention works automatically)
    h('textarea', {
      placeholder: 'Multi-line text...',
      value: state.textareaValue || '',
      onChange: (e) => handleTextareaChange(e.target.value),
      className: 'form-textarea'
    }),
    
    h('div', { className: 'form-output' }, [
      h('p', {}, [`Input: ${state.inputValue || ''}`]),
      h('p', {}, [`Textarea: ${state.textareaValue || ''}`])
    ])
  ]);
}, { inputValue: '', textareaValue: '' });

render(h(FormComponent), '#app');
```

## Advanced Features

### Event Handling

DomKit supports all DOM events using `on` prefixed properties:

```javascript
h('div', {
  onClick: (e) => console.log('Clicked!', e),
  onMouseover: (e) => console.log('Mouse over!', e),
  onKeydown: (e) => {
    if (e.key === 'Enter') {
      console.log('Enter pressed!');
    }
  },
  onFocus: (e) => console.log('Focused!', e),
  onBlur: (e) => console.log('Blurred!', e)
}, ['Interactive element'])
```

### Style Objects and Dynamic Styling

```javascript
const StyledComponent = createStatefulComponent(({ state, setState }) => {
  const toggleColor = () => {
    setState({ 
      color: state.color === 'red' ? 'blue' : 'red' 
    });
  };

  return h('div', {
    style: {
      color: state.color || 'red',
      fontSize: '18px',
      padding: '20px',
      border: `2px solid ${state.color || 'red'}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    onClick: toggleColor
  }, ['Click to change color']);
}, { color: 'red' });
```

### Conditional Rendering

```javascript
const ConditionalComponent = createComponent(({ 
  isVisible, 
  content, 
  showAlternative = false 
}) => {
  if (!isVisible) {
    return showAlternative 
      ? h('div', { className: 'alternative' }, ['Alternative content'])
      : null;
  }
  
  return h('div', { className: 'main-content' }, [content]);
});

// Usage with different conditions
const app = h('div', {}, [
  h(ConditionalComponent, { 
    isVisible: true, 
    content: 'This is visible' 
  }),
  h(ConditionalComponent, { 
    isVisible: false, 
    showAlternative: true 
  })
]);
```

### Lists and Iterations with Keys

```javascript
const TodoList = createStatefulComponent(({ state, setState }) => {
  const addTodo = () => {
    const newTodo = {
      id: Date.now(),
      text: state.newTodoText || '',
      completed: false
    };
    
    setState({
      todos: [...(state.todos || []), newTodo],
      newTodoText: ''
    });
  };

  const toggleTodo = (id) => {
    setState({
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };

  const removeTodo = (id) => {
    setState({
      todos: state.todos.filter(todo => todo.id !== id)
    });
  };

  return h('div', { className: 'todo-app' }, [
    h('h2', {}, ['Todo List']),
    
    // Add new todo
    h('div', { className: 'add-todo' }, [
      DomKit.createInputField({
        type: 'text',
        placeholder: 'Add new todo...',
        value: state.newTodoText || '',
        onChange: (value) => setState({ newTodoText: value })
      }),
      h('button', { onClick: addTodo }, ['Add'])
    ]),
    
    // Todo list with keys for efficient diffing
    h('ul', { className: 'todo-list' }, 
      (state.todos || []).map(todo =>
        h('li', { 
          key: todo.id,
          className: `todo-item ${todo.completed ? 'completed' : ''}` 
        }, [
          h('span', { 
            className: 'todo-text',
            onClick: () => toggleTodo(todo.id)
          }, [todo.text]),
          h('button', { 
            className: 'remove-btn',
            onClick: () => removeTodo(todo.id) 
          }, ['Remove'])
        ])
      )
    )
  ]);
}, { todos: [], newTodoText: '' });
```

### Memoization for Performance

```javascript
const ExpensiveComponent = DomKit.memo(({ data, processData = true }) => {
  // Simulate expensive calculation
  const processedData = processData ? 
    data.items.map(item => ({ ...item, processed: true })) : 
    data.items;

  return h('div', { className: 'expensive-component' }, [
    h('h3', {}, ['Expensive Component']),
    h('p', {}, [`Processed ${processedData.length} items`]),
    h('ul', {}, 
      processedData.map(item => 
        h('li', { key: item.id }, [
          `${item.name} ${item.processed ? '(processed)' : ''}`
        ])
      )
    )
  ]);
}, (prevProps, nextProps) => {
  // Only re-render if data.items length changes or processData changes
  return prevProps.data.items.length === nextProps.data.items.length &&
         prevProps.processData === nextProps.processData;
});

// Usage
const app = h('div', {}, [
  h(ExpensiveComponent, {
    data: { items: [{ id: 1, name: 'Item 1' }] },
    processData: true
  })
]);
```

### Custom Renderers

```javascript
const CustomRenderComponent = (props) => {
  let elementRef = null;
  
  const vnode = h('div', { 
    className: 'custom-render',
    ref: (el) => { elementRef = el; }
  }, ['Custom rendered content']);
  
  // Add custom rendering behavior
  vnode._customRender = (oldNode) => {
    // Pre-render logic
    const wasScrolled = elementRef && elementRef.scrollTop > 0;
    
    // Return post-render callback
    return () => {
      // Post-render logic - restore scroll position
      if (wasScrolled && elementRef) {
        elementRef.scrollTop = 100; // Restore scroll
      }
    };
  };
  
  return vnode;
};
```

### Refs and DOM Manipulation

```javascript
const RefComponent = createStatefulComponent(({ state, setState }) => {
  let inputRef = null;
  let canvasRef = null;
  
  const focusInput = () => {
    if (inputRef) {
      inputRef.focus();
      inputRef.select();
    }
  };

  const drawOnCanvas = () => {
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      ctx.fillStyle = state.canvasColor || 'blue';
      ctx.fillRect(10, 10, 100, 100);
    }
  };

  return h('div', { className: 'ref-component' }, [
    h('h3', {}, ['Refs Example']),
    
    h('input', { 
      ref: (el) => { inputRef = el; },
      type: 'text',
      value: state.inputValue || '',
      onChange: (e) => setState({ inputValue: e.target.value })
    }),
    
    h('button', { onClick: focusInput }, ['Focus Input']),
    
    h('canvas', {
      ref: (el) => { canvasRef = el; },
      width: 200,
      height: 200,
      style: { border: '1px solid #ccc', margin: '10px 0' }
    }),
    
    h('div', {}, [
      h('button', { 
        onClick: () => {
          setState({ canvasColor: 'red' });
          setTimeout(drawOnCanvas, 0);
        }
      }, ['Draw Red']),
      h('button', { 
        onClick: () => {
          setState({ canvasColor: 'blue' });
          setTimeout(drawOnCanvas, 0);
        }
      }, ['Draw Blue'])
    ])
  ]);
}, { inputValue: '', canvasColor: 'blue' });
```

### SVG Support

```javascript
const SvgComponent = createComponent(({ size = 100, color = 'blue' }) => {
  return h('svg', {
    width: size,
    height: size,
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: `0 0 ${size} ${size}`
  }, [
    h('circle', {
      cx: size / 2,
      cy: size / 2,
      r: size / 3,
      fill: color,
      stroke: 'black',
      strokeWidth: 2
    }),
    h('text', {
      x: size / 2,
      y: size / 2,
      textAnchor: 'middle',
      dominantBaseline: 'central',
      fill: 'white',
      fontSize: size / 6
    }, ['SVG'])
  ]);
});

// Usage
const svgApp = h('div', {}, [
  h('h2', {}, ['SVG Examples']),
  h(SvgComponent, { size: 150, color: 'red' }),
  h(SvgComponent, { size: 100, color: 'green' }),
  h(SvgComponent, { size: 75, color: 'purple' })
]);
```

## API Reference

### Core Functions

#### `h(tag, props, children)`
Creates a virtual DOM node. Supports HTML elements, components, and dynamic component loading.

- `tag`: String HTML tag name, component function, or registered component name
- `props`: Object containing element properties, event handlers, and special properties
- `children`: Array of child elements (virtual nodes or strings)

#### `render(vnode, container)`
Renders a virtual DOM tree to a DOM container with efficient diffing and automatic component loading.

- `vnode`: Virtual DOM node to render
- `container`: DOM element or CSS selector to render into

#### `createComponent(template)`
Creates a reusable component from a template function.

- `template`: Function that receives props and returns a virtual DOM structure

### Dynamic Component Loading

#### `configureComponentLoader(settings)`
Configures the dynamic component loading system.

- `settings.domain`: Base domain for component loading
- `settings.componentPath`: Path to components directory
- `settings.components`: Object mapping component names to file paths

#### `loadComponent(name)`
Loads a single component dynamically.

- `name`: Component name to load
- Returns: Promise that resolves to the component function

#### `preloadComponents(names)`
Preloads multiple components.

- `names`: Array of component names to preload
- Returns: Promise that resolves when all components are loaded

#### `isComponentLoaded(name)`
Checks if a component is already loaded.

- `name`: Component name to check
- Returns: Boolean indicating if component is loaded

#### `getComponent(name)`
Gets a loaded component.

- `name`: Component name
- Returns: Component function (throws error if not loaded)

#### `registerComponent(name, path)`
Registers a component for dynamic loading.

- `name`: Component name
- `path`: File path relative to component directory

#### `getComponentConfig()`
Gets current component loader configuration.

- Returns: Object with domain, path, registered components, and loaded components

#### `unloadComponent(name)` / `unloadAllComponents()` / `cleanupComponentLoader()`
Component cleanup utilities.

### State Management

#### `createState(initialState)`
Creates a state management object with batched updates.

- `initialState`: Initial state object
- Returns: Object with `getState`, `setState`, `subscribe`, and `cleanup` methods

#### `createStatefulComponent(renderFn, initialState)`
Creates a component with built-in state management.

- `renderFn`: Function that receives `{ state, setState, ...props }` and returns virtual DOM
- `initialState`: Initial state object

#### `useState(initialState, renderFn, container)`
Hook-style state management with automatic rendering.

- `initialState`: Initial state object
- `renderFn`: Function that receives `(state, setState)` and returns virtual DOM
- `container`: Target container for rendering

#### `createApp(renderFn, initialState, containerSelector)`
Creates an application with automatic state management and rendering.

- `renderFn`: Function that receives `(state, setState)` and returns virtual DOM
- `initialState`: Initial state object
- `containerSelector`: Target container selector

### Form Components

#### `createInputField(props)`
Creates an input field with focus and cursor position retention during re-renders.

- `props`: Standard input properties plus `onChange` callback
- Returns: Virtual DOM node with focus retention behavior

### DOM Injection Methods

#### `inject(vnode, target, position)`
Injects a virtual node into the DOM.

- `vnode`: Virtual DOM node to inject
- `target`: DOM element or CSS selector
- `position`: "replace" (default), "append", or "prepend"

#### `append(vnode, target)` / `prepend(vnode, target)`
Convenience methods for appending/prepending nodes.

#### `updateInjected(vnode, target, index)`
Updates a previously injected component with diffing.

- `index`: Index of the component to update (default: 0)

#### `mount(component, container)`
Convenience method to mount a component function to a container.

### Performance Utilities

#### `memo(component, shouldUpdate)`
Memoizes a component to prevent unnecessary re-renders.

- `component`: Component function to memoize
- `shouldUpdate`: Optional comparison function `(prevProps, nextProps) => boolean`

## Performance Considerations

- DomKit uses an efficient virtual DOM diffing algorithm to minimize DOM operations
- Components are loaded dynamically only when needed, reducing initial bundle size
- Use unique `key` properties when rendering lists for optimal diffing performance
- State updates are automatically batched and debounced using `requestAnimationFrame`
- MutationObserver detects external DOM changes and handles them gracefully
- Use `memo` for expensive components to prevent unnecessary re-renders
- Component loading is cached - components are only loaded once
- Focus retention for inputs works without performance penalties

## Browser Compatibility

DomKit works in all modern browsers that support:
- ES5+ features
- Promise API
- MutationObserver (graceful degradation if not available)
- `requestAnimationFrame` for optimal performance

For older browsers, consider using appropriate polyfills.

## Best Practices

1. **Component Organization**: Keep components in separate files and use the dynamic loading system
2. **State Management**: Use `createApp` for application-level state, `createStatefulComponent` for component-level state
3. **Performance**: Use keys for list items, memoize expensive components
4. **Error Handling**: Components automatically handle errors and display fallback content
5. **Memory Management**: Call cleanup methods when destroying components or apps
6. **Event Handling**: Prefer declarative event handling over manual DOM manipulation

## Migration Guide

If migrating from other frameworks:

- **From React**: DomKit's API is very similar - `h` replaces `createElement`, components work the same way
- **From Vue**: Use `createStatefulComponent` for component-level reactivity
- **From vanilla JS**: Use injection methods to gradually adopt DomKit in existing applications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.