import { CyanBar } from "@/components/ui/CyanBar";
import styles from "./SectionLabel.module.css";

type SectionLabelProps = {
  children: string;
  inverse?: boolean;
};

export function SectionLabel({ children, inverse = false }: SectionLabelProps) {
  return (
    <p
      className={[styles.label, inverse ? styles.inverse : ""].filter(Boolean).join(" ")}
    >
      <CyanBar orientation="horizontal" />
      <span>{children}</span>
    </p>
  );
}
