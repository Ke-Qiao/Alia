import type { ReactNode } from "react";

export function PanelBlock(props: { title: string; children: ReactNode }) {
  return (
    <section className="panel-block">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
