type WorkspaceMockupReferenceProps = {
  image: string;
  title: string;
  role: string;
};

export function WorkspaceMockupReference({ image, title, role }: WorkspaceMockupReferenceProps) {
  return (
    <details className="workspace-mockup-reference" open>
      <summary>
        <span><strong>Approved workspace design</strong><small>{role} · {title}</small></span>
        <span className="workspace-mockup-reference-action">View visual reference</span>
      </summary>
      <div className="workspace-mockup-reference-body">
        <Image alt={`${title} approved workspace mockup`} className="workspace-mockup-image" height={700} src={image} width={1200} />
        <p>Visual source of truth for this role space. Live data, permissions, commands, and audit history remain supplied by the operational workspace below.</p>
      </div>
    </details>
  );
}
import Image from "next/image";
