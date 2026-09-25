import { useState, useEffect, useCallback } from "react";
import { SURVEY_STEPS as DEFAULT_STEPS, DEPARTMENTS } from "../data/surveyQuestion";
import { submitSurveyResponse } from "../services/surveyService";
import { getActivePublishedTemplate } from "../services/templateService";
import { validateSurveyTemplate } from "../data/surveyTemplate";
import ScaleQuestion from "../components/ScaleQuestions";
import ChoiceQuestion from "../components/ChoiceQuestion";
import OpenTextQuestion from "../components/OpenTextQuestion";

export default function WellnessSurvey() {
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | done | error
  const [surveySteps, setSurveySteps] = useState(DEFAULT_STEPS);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const published = await getActivePublishedTemplate();
        const templateErrors = published ? validateSurveyTemplate(published) : [];
        if (published && templateErrors.length === 0) {
          setSurveySteps(published.questions);
        } else if (published && templateErrors.length > 0) {
          console.error("La plantilla publicada no es compatible; se usará la encuesta por defecto.", templateErrors);
        }
      } catch (err) {
        console.error("No se pudo cargar la plantilla publicada, usando la encuesta por defecto.", err);
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, []);

  const step = surveySteps[stepIndex];
  const isLast = stepIndex === surveySteps.length - 1;
  const progress = Math.round(((stepIndex + 1) / surveySteps.length) * 100);

  const currentValue = answers[step?.id];
  const canAdvance = step?.required === false || currentValue !== undefined;

  const goNext = useCallback(async () => {
    if (!canAdvance || status === "submitting") return;

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    setStatus("submitting");
    try {
      await submitSurveyResponse({ departmentId, answers, questions: surveySteps });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [canAdvance, isLast, departmentId, answers, status, surveySteps]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const setAnswer = useCallback((value) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  }, [step]);

  // Atajos de teclado: Enter = siguiente, Shift+Tab = atrás, 0-9 = escala
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Enter") {
        goNext();
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        goBack();
      } else if (step?.type === "scale") {
        let num = null;
        if (e.key >= "1" && e.key <= "9") num = Number(e.key);
        else if (e.key === "0") num = 10;
        if (num !== null && num >= step.min && num <= step.max) setAnswer(num);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, goNext, goBack, setAnswer]);

  if (loadingTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-body-md text-on-surface-variant">Cargando encuesta...</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="max-w-md text-center bg-surface-container-lowest rounded-xl shadow-xl p-10">
          <span className="material-symbols-outlined text-secondary text-[48px]">check_circle</span>
          <h1 className="text-headline-lg text-on-surface mt-4 mb-2">¡Gracias por tu respuesta!</h1>
          <p className="text-body-md text-on-surface-variant">
            Tu retroalimentación fue registrada de forma confidencial.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full relative min-h-screen items-center justify-center py-10 px-4 sm:px-6 bg-surface overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-surface-variant/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[30rem] h-[30rem] rounded-full bg-surface-container-high/60 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="w-full bg-surface-container-lowest/90 backdrop-blur-xl rounded-xl shadow-xl p-8 sm:p-12">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface text-label-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                {step.category}
              </span>
              <span className="text-on-surface-variant text-label-sm">
                Pregunta {stepIndex + 1} de {surveySteps.length}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-secondary text-label-sm bg-surface-container-low px-2.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              Confidencial
            </span>
          </div>

          {/* Progreso */}
          <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden mb-10">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Selector de departamento solo en el primer paso */}
          {stepIndex === 0 && (
            <div className="mb-6">
              <label className="text-label-sm text-on-surface-variant uppercase tracking-widest">
                Departamento
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 w-full rounded-md border border-outline-variant bg-surface-container-lowest p-3 text-body-md text-on-surface"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Pregunta */}
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-headline-sm text-on-surface-variant tracking-wider">
              {String(stepIndex + 1).padStart(2, "0")}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">arrow_forward</span>
            <span className="text-on-surface-variant text-label-sm uppercase tracking-widest">{step.label}</span>
          </div>
          <h1 className="text-headline-xl text-on-surface mb-3 tracking-tight">{step.title}</h1>
          {step.helper && (
            <p className="text-body-md text-on-surface-variant mb-8 max-w-xl">{step.helper}</p>
          )}

          {step.type === "scale" && (
            <ScaleQuestion
              min={step.min}
              max={step.max}
              value={currentValue}
              onChange={setAnswer}
              lowLabel={step.lowLabel}
              highLabel={step.highLabel}
            />
          )}
          {step.type === "choice" && (
            <ChoiceQuestion options={step.options} value={currentValue} onChange={setAnswer} />
          )}
          {step.type === "text" && (
            <OpenTextQuestion value={currentValue || ""} onChange={setAnswer} />
          )}

          {status === "error" && (
            <p className="text-error text-body-sm mt-4">
              Ocurrió un error al enviar tu respuesta. Intenta de nuevo.
            </p>
          )}

          {/* Navegación */}
          <div className="pt-10 mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-on-surface text-headline-sm hover:bg-surface-container-low transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Atrás</span>
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance || status === "submitting"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md bg-primary text-on-primary text-headline-sm shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
            >
              <span>{isLast ? (status === "submitting" ? "Enviando..." : "Enviar") : "Siguiente"}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            Tus respuestas son confidenciales y se envían de forma segura.
          </p>
        </div>
      </div>
    </div>
  );
}