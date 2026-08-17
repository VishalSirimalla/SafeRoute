import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function AnimatedNumber({ value = 0, duration = 1.2 }) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const targetNumber = Number(value) || 0;

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(targetNumber);
      return;
    }

    let startTimestamp = null;
    const startValue = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease-out cubic curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(easeProgress * (targetNumber - startValue) + startValue);
      setDisplayValue(currentValue);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetNumber);
      }
    };

    const animId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animId);
  }, [targetNumber, duration, shouldReduceMotion]);

  return <span>{displayValue}</span>;
}
