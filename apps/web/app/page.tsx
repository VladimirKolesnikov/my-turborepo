import styles from "./page.module.css";
import { WorkspaceClient } from "./workspace-client";

export default function Home() {
  return (
    <main className={styles.page}>
      <WorkspaceClient />
    </main>
  );
}
