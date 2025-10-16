import React, { useState } from 'react';

const Counter = () => {
  // Declare a state variable 'count' and a function 'setCount' to update it.
  // The initial value of 'count' is set to 0.
  const [count, setCount] = useState(0);

  // Function to increment the counter
  const increment = () => {
    setCount(prevCount => prevCount + 1);
  };

  // Function to decrement the counter
  const decrement = () => {
    setCount(prevCount => prevCount - 1);
  };

  return (
    <div>
      <h2>Counter: {count}</h2>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};

export default Counter;