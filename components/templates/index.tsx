import type { Template } from "@/lib/utils";

import { Harvard } from "./harvard";

export const getTemplate = (template: Template) => {
  switch (template) {
    case "harvard": {
      return Harvard;
    }
    default: {
      return Harvard;
    }
  }
};
