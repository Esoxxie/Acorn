import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LogFlowProvider, useLogFlow } from "../features/log/LogFlow";

const analyzeEntryMock = vi.fn();

vi.mock("../app/contexts", () => ({
  useAppData: () => ({
    saveMeal: vi.fn(),
    updateMeal: vi.fn(),
  }),
  useAuth: () => ({
    user: {
      uid: "user-1",
      isDemo: false,
    },
  }),
}));

vi.mock("../lib/env", () => ({
  appEnv: {
    usingDemoConfig: false,
  },
}));

vi.mock("../lib/firebase", () => ({
  analyzeEntry: (...args: unknown[]) => analyzeEntryMock(...args),
}));

vi.mock("../lib/demo-estimate", () => ({
  createDemoEstimate: vi.fn(),
}));

vi.mock("../lib/image", () => ({
  prepareImageAssets: vi.fn(),
  releasePreparedImageAssets: vi.fn(),
}));

function OpenButton() {
  const { openLogFlow } = useLogFlow();
  return <button onClick={openLogFlow} type="button">Oeffnen</button>;
}

describe("LogFlow error messaging", () => {
  it("shows callable details for analyze failures", async () => {
    analyzeEntryMock.mockRejectedValueOnce({
      message: "internal",
      details: {
        message: "Wir konnten aus diesem Eintrag kein Lebensmittel erkennen. Bitte nenne das Gericht oder ein paar Zutaten genauer.",
      },
    });

    render(
      <LogFlowProvider>
        <OpenButton />
      </LogFlowProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Oeffnen" }));
    expect(screen.getByText("Foto aufnehmen")).toBeInTheDocument();
    expect(screen.getByText("Aus Galerie waehlen")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schaetzen" }));

    await waitFor(() => {
      expect(
        screen.getByText("Wir konnten aus diesem Eintrag kein Lebensmittel erkennen. Bitte nenne das Gericht oder ein paar Zutaten genauer."),
      ).toBeInTheDocument();
    });
  });
});
