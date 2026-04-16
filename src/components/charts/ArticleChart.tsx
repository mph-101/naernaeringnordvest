import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  ZAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import logoImg from "@/assets/logo.png";

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "scatter"
  | "stackedBar"
  | "horizontalBar";

export interface ChartData {
  type: ChartType;
  title: string;
  subtitle?: string;
  source: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Headers from CSV — first is the x/category axis, the rest are series */
  headers: string[];
  /** Rows of data values aligned to headers */
  rows: (string | number)[][];
}

/**
 * Standardised Nær Næring chart palette — derived from the editorial pastel system
 * but with enough contrast to read as data. Order matters (first series = primary).
 */
const CHART_COLORS = [
  "hsl(14, 65%, 62%)", // primary peach
  "hsl(350, 50%, 60%)", // dusty rose
  "hsl(35, 55%, 55%)", // warm ochre
  "hsl(200, 40%, 50%)", // muted teal
  "hsl(280, 30%, 55%)", // dusty plum
  "hsl(140, 30%, 45%)", // sage
  "hsl(25, 40%, 40%)", // earth brown
  "hsl(220, 25%, 45%)", // slate
];

const formatNumber = (v: any): string => {
  if (typeof v !== "number" || !isFinite(v)) return String(v ?? "");
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 }).format(v);
};

interface ArticleChartProps {
  data: ChartData;
  className?: string;
}

export const ArticleChart = ({ data, className = "" }: ArticleChartProps) => {
  const { type, title, subtitle, source, xAxisLabel, yAxisLabel, headers, rows } = data;
  if (!headers?.length || !rows?.length) return null;

  // Recharts needs an array of objects keyed by header
  const chartData = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      const v = row[i];
      const num = typeof v === "number" ? v : Number(v);
      obj[h] = isNaN(num) || v === "" || v == null ? (v as string) : num;
    });
    return obj;
  });

  const xKey = headers[0];
  const seriesKeys = headers.slice(1);

  const axisStyle = {
    fontSize: 12,
    fontFamily: "'Source Sans 3', sans-serif",
    fill: "hsl(var(--muted-foreground))",
  };

  const renderChart = () => {
    if (type === "pie") {
      // Pie uses the first series only
      const firstSeries = seriesKeys[0];
      const pieData = chartData.map((row) => ({
        name: String(row[xKey]),
        value: typeof row[firstSeries] === "number" ? (row[firstSeries] as number) : 0,
      }));
      return (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={50}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              style={{ fontSize: 12, fontFamily: "'Source Sans 3', sans-serif" }}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="hsl(var(--background))" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any) => formatNumber(v)}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    const tooltip = (
      <Tooltip
        formatter={(v: any) => formatNumber(v)}
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          fontFamily: "'Source Sans 3', sans-serif",
          fontSize: 13,
        }}
      />
    );

    const legend = seriesKeys.length > 1 && (
      <Legend
        wrapperStyle={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, paddingTop: 8 }}
        iconType="circle"
      />
    );

    // Horizontal bar — swap axes: numeric X, categorical Y
    if (type === "horizontalBar") {
      return (
        <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 36 + 80)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: xAxisLabel ? 24 : 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              tick={axisStyle}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={formatNumber}
              label={
                xAxisLabel
                  ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: axisStyle }
                  : undefined
              }
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            {tooltip}
            {legend}
            {seriesKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const commonAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={axisStyle}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
          label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: axisStyle } : undefined}
        />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatNumber}
          label={
            yAxisLabel
              ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { ...axisStyle, textAnchor: "middle" } }
              : undefined
          }
        />
        {tooltip}
        {legend}
      </>
    );

    if (type === "line") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: yAxisLabel ? 24 : 8, left: yAxisLabel ? 8 : 0 }}>
            {commonAxes}
            {seriesKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === "area") {
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: yAxisLabel ? 24 : 8, left: yAxisLabel ? 8 : 0 }}>
            {commonAxes}
            {seriesKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === "scatter") {
      // Scatter: first column = numeric X, each remaining column = a series.
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: yAxisLabel ? 24 : 8, left: yAxisLabel ? 8 : 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              name={xKey}
              tick={axisStyle}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              tickFormatter={formatNumber}
              label={
                xAxisLabel
                  ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: axisStyle }
                  : undefined
              }
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatNumber}
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { ...axisStyle, textAnchor: "middle" } }
                  : undefined
              }
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(v: any) => formatNumber(v)}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontFamily: "'Source Sans 3', sans-serif",
                fontSize: 13,
              }}
            />
            {legend}
            {seriesKeys.map((key, i) => {
              const points = chartData
                .map((row) => ({ x: row[xKey], y: row[key] }))
                .filter((p) => typeof p.x === "number" && typeof p.y === "number");
              return (
                <Scatter
                  key={key}
                  name={key}
                  data={points}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    // bar (default) and stackedBar share the BarChart layout
    const isStacked = type === "stackedBar";
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: yAxisLabel ? 24 : 8, left: yAxisLabel ? 8 : 0 }}>
          {commonAxes}
          {seriesKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={isStacked ? (i === seriesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]) : [4, 4, 0, 0]}
              stackId={isStacked ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <figure
      className={`my-6 rounded-xl border border-border bg-card p-4 sm:p-5 not-prose ${className}`}
      data-nn-chart="true"
    >
      <figcaption className="mb-3">
        <h3 className="font-headline text-lg sm:text-xl font-semibold text-headline leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground font-body">{subtitle}</p>
        )}
      </figcaption>

      <div className="w-full">{renderChart()}</div>

      <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-2">
          <img
            src={logoImg}
            alt="Nær Næring"
            className="w-5 h-5 object-contain dark:bg-white dark:rounded-full dark:p-0.5"
            width={20}
            height={20}
          />
          <span className="font-headline text-xs font-semibold text-foreground/80">Nær Næring</span>
        </div>
        <span className="text-xs text-muted-foreground font-body italic">{source}</span>
      </div>
    </figure>
  );
};
