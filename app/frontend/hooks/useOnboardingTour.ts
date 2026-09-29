import { useEffect, useRef, useState } from "react";
import { ACTIONS, EVENTS, STATUS, type EventData } from "react-joyride";

const ONBOARDING_STORAGE_KEY = "iv:onboarding:wiki-bubble-chart:v1";

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, new Date().toISOString());
  } catch {
    /* storage unavailable */
  }
}

interface UseOnboardingTourOptions {
  hasData: boolean;
  onStepChange?: (nextIndex: number) => void;
}

function useOnboardingTour({
  hasData,
  onStepChange,
}: UseOnboardingTourOptions) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFirstVisit] = useState(() => !hasSeenTour());
  const autoStarted = useRef(false);

  useEffect(() => {
    if (isFirstVisit && hasData && !autoStarted.current) {
      autoStarted.current = true;
      setRun(true);
    }
  }, [isFirstVisit, hasData]);

  const startTour = () => {
    setStepIndex(0);
    setRun(true);
  };

  const endTour = () => {
    setRun(false);
    markTourSeen();
  };

  const handleEvent = ({ action, index, status, type }: EventData) => {
    if (
      action === ACTIONS.CLOSE ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      endTour();
      return;
    }

    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      onStepChange?.(nextIndex);
      setStepIndex(nextIndex);
    }
  };

  return { run, stepIndex, startTour, handleEvent };
}

export { useOnboardingTour, ONBOARDING_STORAGE_KEY, hasSeenTour, markTourSeen };
