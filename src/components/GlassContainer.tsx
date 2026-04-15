import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'dark';
}

export default function GlassContainer({ children, className = "", variant = 'dark' }: GlassContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-morphism${variant === 'light' ? '-light' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
