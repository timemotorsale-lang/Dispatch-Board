type WorkspaceMockupReferenceProps = {
  image: string;
  title: string;
  role: string;
};

export function WorkspaceMockupReference({ image, title, role }: WorkspaceMockupReferenceProps) {
  return (
    <section className="workspace-mockup-reference">
      <header>
        <span><strong>Approved workspace design</strong><small>{role} · {title}</small></span>
        <a className="workspace-mockup-reference-action" href={image} rel="noreferrer" target="_blank">Open full image</a>
      </header>
      <div className="workspace-mockup-reference-body">
        <Image alt={`${title} approved workspace mockup`} className="workspace-mockup-image" height={700} src={image} width={1200} />
        <p>Visual source of truth for this role space. Live data, permissions, commands, and audit history remain supplied by the operational workspace below.</p>
      </div>
    </section>
  );
}
import Image from "next/image";
