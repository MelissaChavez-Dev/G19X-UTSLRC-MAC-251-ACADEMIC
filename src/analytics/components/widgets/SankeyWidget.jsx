import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

const NODE_COLORS = ["#355c4b", "#74846a", "#4f8070", "#d1b65c", "#8b9a7b", "#9b9a91", "#b5a98b"];

export default function SankeyWidget({
  nodes = [], // [{ name: "Tech" }, { name: "Better Opportunity" }]
  links = [], // [{ source: 0, target: 4, value: 12 }]
  width = 600,
  height = 280,
  compact = false,
}) {
  const sankeyData = useMemo(() => {
    if (!nodes.length || !links.length) return null;

    try {
      // Deep clone inputs since d3-sankey mutates them
      const graph = {
        nodes: nodes.map((d) => ({ ...d })),
        links: links.map((d) => ({ ...d })),
      };

      const sankeyGenerator = sankey()
        .nodeWidth(16)
        .nodePadding(12)
        .extent([[10, 10], [width - 10, height - 10]]);

      return sankeyGenerator(graph);
    } catch (err) {
      console.warn("Fallo en cálculo de Sankey:", err);
      return null;
    }
  }, [nodes, links, width, height]);

  if (!sankeyData) {
    return (
      <div className={`flex h-full items-center justify-center text-on-surface-variant ${compact ? "min-h-0 text-[10px]" : "min-h-56 text-body-sm"}`}>
        Sin flujos de datos suficientes para el diagrama Sankey.
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal();

  return (
    <div className="w-full overflow-x-auto flex justify-center">
      <svg width={width} height={height} className="select-none">
        {/* Links */}
        <g fill="none">
          {sankeyData.links.map((link, i) => (
            <path
              key={`link-${i}`}
              d={linkPath(link)}
              stroke="#9b9a91"
              strokeOpacity={0.35}
              strokeWidth={Math.max(1, link.width)}
              className="hover:stroke-primary hover:stroke-opacity-70 transition-all cursor-pointer"
            >
              <title>{`${link.source.name} → ${link.target.name}: ${link.value}`}</title>
            </path>
          ))}
        </g>

        {/* Nodes */}
        <g>
          {sankeyData.nodes.map((node, i) => {
            const isLeft = node.x0 < width / 2;
            const color = NODE_COLORS[i % NODE_COLORS.length];
            return (
              <g key={`node-${i}`}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(2, node.y1 - node.y0)}
                  fill={color}
                  rx={3}
                >
                  <title>{`${node.name}: ${node.value}`}</title>
                </rect>
                <text
                  x={isLeft ? node.x1 + 6 : node.x0 - 6}
                  y={(node.y0 + node.y1) / 2}
                  dy="0.35em"
                  textAnchor={isLeft ? "start" : "end"}
                  fontSize={compact ? 8 : 11}
                  fill="var(--on-surface)"
                  className="font-medium"
                >
                  {node.name} ({node.value})
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
