import type { WidgetSpec } from '../shared/types';
import { SensorValueWidget } from './SensorValue';
import { BinarySensorWidget } from './BinarySensor';
import { LightToggleWidget } from './LightToggle';
import { LineGraphWidget } from './LineGraph';
import { ClockWidget } from './Clock';
import { PageTabsWidget } from './PageTabs';

const widgetRegistry = new Map<string, WidgetSpec>([
  ['sensor-value', SensorValueWidget as WidgetSpec],
  ['binary-sensor', BinarySensorWidget as WidgetSpec],
  ['light-toggle', LightToggleWidget as WidgetSpec],
  ['line-graph', LineGraphWidget as WidgetSpec],
  ['clock', ClockWidget as WidgetSpec],
  ['page-tabs', PageTabsWidget as WidgetSpec],
]);

export function getWidget(id: string): WidgetSpec | undefined {
  return widgetRegistry.get(id);
}

export function listWidgets(): WidgetSpec[] {
  return Array.from(widgetRegistry.values());
}
