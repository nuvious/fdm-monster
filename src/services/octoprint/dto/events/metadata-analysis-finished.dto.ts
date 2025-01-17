export interface MetadataAnalysisFinishedDto {
  name?: string;
  path?: string;
  origin?: string;
  result?: {
    printingArea?: {
      maxX?: number;
      maxY?: number;
      maxZ?: number;
      minX?: number;
      minY?: number;
      minZ?: number;
      [k: string]: any;
    };
    dimensions?: {
      depth?: number;
      height?: number;
      width?: number;
      [k: string]: any;
    };
    estimatedPrintTime?: number;
    filament?: {
      tool0?: {
        length?: number;
        volume?: number;
        [k: string]: any;
      };
      [k: string]: any;
    };
    [k: string]: any;
  };
  [k: string]: any;
}
