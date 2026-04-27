import { type ReactNode } from 'react';
import styles from './Wrapper.module.css';
interface WrapperProps {
  backgroundColor: string;
  children: ReactNode;
}

function Wrapper({ backgroundColor, children }: WrapperProps) {
  return (
    <div
      className={styles.wrapper}
      style={{ '--local-bg': backgroundColor } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export default Wrapper;
