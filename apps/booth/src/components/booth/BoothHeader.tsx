import Image from "next/image";

type BoothHeaderProps = {
  boothName: string;
  logoUrl?: string | null;
};

export function BoothHeader({ boothName, logoUrl }: BoothHeaderProps) {
  const src = logoUrl ?? "/brand/event-lab-logo.png";
  const isRemote = src.startsWith("http");

  return (
    <header className="booth-header">
      {isRemote ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Event Lab" className="booth-header__logo" />
      ) : (
        <Image
          src={src}
          alt="Event Lab"
          width={160}
          height={40}
          className="booth-header__logo"
          priority
        />
      )}
      <span className="booth-header__title">{boothName}</span>
    </header>
  );
}
