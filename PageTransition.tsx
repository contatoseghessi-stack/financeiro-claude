import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.25,
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for lists
const staggerContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const staggerItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function StaggerList({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={staggerItemVariants}
      transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated counter for KPI values
interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1, className, formatFn }: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={value}
    >
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, duration }}
      >
        {prefix}{formatFn ? formatFn(value) : value.toLocaleString("pt-BR")}{suffix}
      </motion.span>
    </motion.span>
  );
}
