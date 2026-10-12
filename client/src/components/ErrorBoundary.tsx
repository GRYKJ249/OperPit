import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
      const ar = rtl;
      return <main className="safe-recovery" role="alert" dir={rtl ? "rtl" : "ltr"}>
        <div className="safe-recovery__mark"><AlertTriangle size={22} /></div>
        <p className="eyebrow">{ar ? "إشارة تعافٍ" : "RECOVERY SIGNAL"}</p>
        <h1>{ar ? "لحظة هدوء… الأرشيف يعود للعمل." : "A brief pause. The archive is recovering."}</h1>
        <p>{ar ? "لم تُعرض تفاصيل تقنية أو بيانات داخلية. جرّب إعادة تحميل الصفحة؛ بياناتك المحلية لم تتأثر." : "Technical details and internal data are hidden. Reload this page to try again; your local preferences are unchanged."}</p>
        <div className="safe-recovery__actions"><button className="button button--primary" onClick={() => window.location.reload()}><RotateCcw size={16} />{ar ? "أعد تحميل الصفحة" : "Reload page"}</button><a className="button button--quiet" href="/"><Home size={16} />{ar ? "العودة للرئيسية" : "Return home"}</a></div>
        <small>{ar ? "معرّف العطل لا يُشارك مع الزوار." : "No error trace is shown to visitors."}</small>
      </main>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
