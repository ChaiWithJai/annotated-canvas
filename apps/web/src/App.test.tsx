import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Annotated web shell", () => {
  function renderAt(pathname: string) {
    window.history.pushState(null, "", pathname);
    return render(<App />);
  }

  it("renders the p50 feed with source attribution visible", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 2, name: "Public feed" })).toBeInTheDocument();
    expect(screen.getAllByText("youtube.com")[0]).toBeInTheDocument();
    expect(screen.getAllByText("File a claim")[0]).toBeInTheDocument();
  });

  it("keeps the p95 claim workflow explicit as a notice flow", async () => {
    const user = userEvent.setup();
    renderAt("/");

    await user.click(screen.getAllByText("File a claim")[0]);

    expect(screen.getByRole("dialog", { name: "File a claim" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ask for a review" })).toBeInTheDocument();
    expect(screen.getByText(/keep the annotation visible/i)).toBeInTheDocument();
  });

  it("renders p95 empty feed and removed permalink states", () => {
    const { unmount } = renderAt("/empty");
    expect(screen.getByText("No annotations yet.")).toBeInTheDocument();
    unmount();

    renderAt("/a/removed");
    expect(screen.getByText(/has been removed by the author/i)).toBeInTheDocument();
    expect(screen.getByText("youtube.com")).toBeInTheDocument();
  });

  it("renders profile follow state changes", async () => {
    const user = userEvent.setup();
    renderAt("/u/mira");

    await user.click(screen.getByRole("button", { name: /follow/i }));

    expect(screen.getByRole("button", { name: /following/i })).toBeInTheDocument();
  });

  it("renders the marketing signup view with feed preview", () => {
    renderAt("/home");

    expect(screen.getByRole("heading", { name: /save the exact moment/i })).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.getByText("View public feed")).toBeInTheDocument();
  });

  it("renders the bounty URL capture composer on the feed", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { name: "Create an annotation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Source URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Your note")).toBeInTheDocument();
  });

  it("renders comments on the permalink page", () => {
    renderAt("/a/ann_video_minimalism");

    expect(screen.getByText("Discussion")).toBeInTheDocument();
    expect(screen.getByText(/source link matters here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add a comment")).toBeInTheDocument();
  });
});
