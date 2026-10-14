import welfareLogo from "../assets/welfare-logo.png";
import welfareWordmark from "../assets/welfare-letras.png";

export default function WelfareLogo({ compact = false, className = "" }) {
  return (
    <img
      src={compact ? welfareLogo : welfareWordmark}
      alt="Welfare"
      className={className}
    />
  );
}
