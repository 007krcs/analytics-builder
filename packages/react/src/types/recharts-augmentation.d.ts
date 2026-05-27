/**
 * Recharts type augmentation.
 *
 * Recharts 2.x components are typed as class components whose constructor
 * signature pre-dates the `deprecatedLegacyContext` parameter introduced in
 * @types/react@18.3+. Strict environments (and tsup's rollup-plugin-dts step
 * during library packaging) flag this as a JSX compatibility error:
 *
 *   Type 'Pie' is missing the following properties from type
 *   'Component<any, any, any>': context, setState, forceUpdate, props, refs
 *
 * We re-declare every recharts component we use as `React.ComponentType<any>`,
 * which satisfies React 18.3+ JSX without changing runtime behavior. The
 * runtime values come from the real recharts module; this file only provides
 * looser *type* shapes during compilation.
 *
 * When recharts 3.x lands with native React 19 support, delete this file.
 */

import type { ComponentType } from 'react';

declare module 'recharts' {
  // Charts (containers)
  export const BarChart:        ComponentType<any>;
  export const LineChart:       ComponentType<any>;
  export const AreaChart:       ComponentType<any>;
  export const ScatterChart:    ComponentType<any>;
  export const PieChart:        ComponentType<any>;
  export const RadarChart:      ComponentType<any>;
  export const RadialBarChart:  ComponentType<any>;
  export const ComposedChart:   ComponentType<any>;
  export const FunnelChart:     ComponentType<any>;
  export const Treemap:         ComponentType<any>;
  export const Sankey:          ComponentType<any>;
  export const ResponsiveContainer: ComponentType<any>;

  // Series
  export const Bar:       ComponentType<any>;
  export const Line:      ComponentType<any>;
  export const Area:      ComponentType<any>;
  export const Scatter:   ComponentType<any>;
  export const Pie:       ComponentType<any>;
  export const Radar:     ComponentType<any>;
  export const RadialBar: ComponentType<any>;
  export const Funnel:    ComponentType<any>;

  // Axes / scales
  export const XAxis:          ComponentType<any>;
  export const YAxis:          ComponentType<any>;
  export const ZAxis:          ComponentType<any>;
  export const PolarAngleAxis: ComponentType<any>;
  export const PolarRadiusAxis: ComponentType<any>;
  export const PolarGrid:      ComponentType<any>;
  export const CartesianGrid:  ComponentType<any>;

  // Decorations
  export const Tooltip:       ComponentType<any>;
  export const Legend:        ComponentType<any>;
  export const ReferenceLine: ComponentType<any>;
  export const ReferenceArea: ComponentType<any>;
  export const ReferenceDot:  ComponentType<any>;
  export const Cell:          ComponentType<any>;
  export const Label:         ComponentType<any>;
  export const LabelList:     ComponentType<any>;
  export const Brush:         ComponentType<any>;
}
