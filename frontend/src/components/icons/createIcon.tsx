import { forwardRef, type ComponentType, type SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  /** Ukuran fallback dalam px. Class Tailwind (mis. `w-4 h-4`) tetap menang. */
  size?: number | string;
};

/** Komponen icon hasil registry — pengganti tipe `LucideIcon`. */
export type IconComponent = ComponentType<IconProps>;

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Bungkus SVG hasil svgr agar berperilaku seperti icon: mewarisi warna teks & punya ukuran default. */
export function createIcon(Svg: SvgComponent, displayName: string): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, width, height, ...rest }, ref) => (
      <Svg
        ref={ref}
        width={width ?? size}
        height={height ?? size}
        aria-hidden="true"
        focusable="false"
        {...rest}
      />
    ),
  );
  Icon.displayName = displayName;
  return Icon as IconComponent;
}
