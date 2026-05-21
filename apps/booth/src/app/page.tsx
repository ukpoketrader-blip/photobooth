import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="booth-fullscreen booth-fullscreen--splash">
      <Image
        src="/brand/event-lab-logo.png"
        alt="Event Lab"
        width={200}
        height={50}
        priority
      />
      <p className="text-display-kiosk" style={{ fontSize: "2.5rem" }}>
        Photobooth
      </p>
      <p className="text-body-lead">Open a booth to start the experience</p>
      <Link
        href="/b/demo-booth"
        className="md-btn md-btn--hero"
        style={{ maxWidth: 320, textDecoration: "none" }}
      >
        Launch demo booth
      </Link>
    </main>
  );
}
