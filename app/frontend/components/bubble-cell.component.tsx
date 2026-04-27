import React from "react";
import type { BubbleSizeFields, RadiusScales } from "../types/bubble-chart.type";

const BUBBLE_BOX = 44;
const BUBBLE_HALF = BUBBLE_BOX / 2;

type BubbleCellProps = {
  row: BubbleSizeFields;
  scales: RadiusScales;
};

const BubbleCell: React.FC<BubbleCellProps> = ({ row, scales }) => {
  return (
    <td className="ArticleLangCell ArticleLangCell--present">
      <svg
        className="ArticleLangCellBubble"
        width={BUBBLE_BOX}
        height={BUBBLE_BOX}
        viewBox={`-${BUBBLE_HALF} -${BUBBLE_HALF} ${BUBBLE_BOX} ${BUBBLE_BOX}`}
        role="img"
        aria-label="Available"
      >
        <circle
          r={scales.talk(row.talk_size)}
          fill="none"
          stroke="#2196f3"
          strokeWidth={1.5}
        />
        <circle
          r={scales.prevArticle(row.prev_article_size)}
          fill="none"
          stroke="#64b5f6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <circle
          r={scales.lead(row.lead_section_size)}
          fill="#90caf9"
          opacity={0.8}
        />
        <circle
          r={scales.article(row.article_size)}
          fill="#0d47a1"
          opacity={0.5}
          stroke="white"
          strokeWidth={1}
        />
      </svg>
    </td>
  );
};

export default BubbleCell;
