/**
 * Shim that adds renderHook (introduced in @testing-library/react v13)
 * to the v12 package that ships with this project (React 17 compatible).
 *
 * We require the real package by absolute path so Jest's moduleNameMapper
 * does not create a circular reference back to this file.
 */
const React = require('react');
// Require the real package by resolved path to bypass moduleNameMapper
const realRTL = require('@testing-library/react/dist/index');
const { render, act } = realRTL;

function renderHook(renderCallback, options) {
  const wrapper = options && options.wrapper;
  const initialProps = options && options.initialProps;

  const results = { current: undefined, error: undefined };

  function TestComponent({ hookProps }) {
    try {
      results.current = renderCallback(hookProps);
    } catch (e) {
      results.error = e;
    }
    return null;
  }

  function WrappedComponent({ hookProps }) {
    const inner = React.createElement(TestComponent, { hookProps });
    return wrapper ? React.createElement(wrapper, null, inner) : inner;
  }

  const { rerender: baseRerender, unmount } = render(
    React.createElement(WrappedComponent, { hookProps: initialProps })
  );

  function rerender(newProps) {
    baseRerender(React.createElement(WrappedComponent, { hookProps: newProps }));
  }

  return { result: results, rerender, unmount };
}

module.exports = { ...realRTL, renderHook };
