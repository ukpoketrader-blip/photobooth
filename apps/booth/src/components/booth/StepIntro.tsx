type StepIntroProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
};

export function StepIntro({ eyebrow, title, lead }: StepIntroProps) {
  return (
    <header className="step-intro">
      {eyebrow ? <p className="step-intro__eyebrow">{eyebrow}</p> : null}
      <h2 className="step-intro__title">{title}</h2>
      {lead ? <p className="step-intro__lead">{lead}</p> : null}
    </header>
  );
}
