import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomFieldRenderer } from "./CustomFieldRenderer";
import type { CustomFieldDefinition } from "../types";

function def(partial: Partial<CustomFieldDefinition> & Pick<CustomFieldDefinition, "type" | "key" | "label">): CustomFieldDefinition {
  return {
    id: partial.id ?? `cf-${partial.key}`,
    companyId: "c1",
    entity: "LEAD",
    required: false,
    sortOrder: 0,
    options: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("CustomFieldRenderer", () => {
  it("renders a text field and reports changes", async () => {
    const onChange = vi.fn();
    render(<CustomFieldRenderer definition={def({ type: "text", key: "nicho", label: "Nicho" })} value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Nicho"), "consultoria");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders select options", () => {
    render(
      <CustomFieldRenderer
        definition={def({ type: "select", key: "origem", label: "Origem", options: ["A", "B"], required: true })}
        value=""
        onChange={() => undefined}
      />,
    );
    expect(screen.getByLabelText("Origem *")).toBeInTheDocument();
  });

  it("renders bool as checkbox", async () => {
    const onChange = vi.fn();
    render(
      <CustomFieldRenderer
        definition={def({ type: "bool", key: "vip", label: "VIP" })}
        value={false}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByLabelText("VIP"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
