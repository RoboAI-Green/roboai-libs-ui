/**
 * Help text for sidebar section labels, collected from the previous
 * React/FastAPI frontend (libs-spectra-simulator-react-fastapi-frontend).
 *
 * Single source of truth for the info-button copy. Te/Ne differ between
 * static and dynamic/3d modes, so both variants are kept here.
 */
export const HELP_TEXT = {
  type: "Simulation output type. Static: a single spectrum at fixed plasma conditions. Time slider: a time-resolved spectrum you can scrub through as the plasma evolves. 3D surface: the spectrum's evolution over time rendered as a 3D surface. Time slider and 3D surface are intended for interactive-size grids; use the Python API for finer wavelength grids.",
  sampleComposition:
    "Elements that make up the sample and their relative proportions. Proportions should sum to 1 (100%); each value sets how much that element contributes to the simulated spectrum.",
  teStatic: "Electron temperature.",
  teDynamic:
    "Reference electron temperature for the dynamic decay curve. Electron temperature at 100 ns.",
  neStatic: "Electron density.",
  neDynamic: "Reference electron density for the dynamic decay curve. Electron density at 100 ns.",
  resolution:
    "Step size of the output wavelength grid. Smaller values sample the spectrum more finely, but calculation and plotting are slower. Ignored when an Output Wavelength Grid is uploaded.",
  outputGrid:
    "Upload a custom output wavelength axis in nm. Supported formats: .npy, .csv, .txt, .tsv, .dat. When uploaded, the file wavelength points are used for calculation and plotting, and Resolution plus Wavelength range are ignored.",
  fwhm: "Full width at half maximum of instrumental broadening. 0 means no instrumental broadening; values above 0 broaden the simulated spectrum using the selected profile.",
  instrumentProfile:
    "Line shape used for instrumental broadening. Gaussian is a common approximation for instrument resolution; Lorentzian produces broader line wings.",
  // Single label summarising the per-preset help below.
  plasmaModel:
    "Spatial structure of the plasma along the line of sight. Uniform uses one layer with constant temperature and density; Weak and Strong add increasingly layered gradients where outer layers are cooler and less dense; Custom lets you set the layer count, temperature and density ratios, and length distribution.",
  plasmaUniform:
    "Single-layer uniform plasma. The full line of sight uses the same electron temperature and electron density.",
  plasmaWeak:
    "Weakly layered plasma. Outer layers have slightly lower temperature and density than the inner layer, approximating a mild spatial gradient.",
  plasmaStrong:
    "Strongly layered plasma. Outer layers have clearly lower temperature and density than the inner layer, approximating a stronger spatial gradient.",
  plasmaCustom:
    "Custom line-of-sight layer settings, including layer count, temperature ratio, density ratio, and length distribution.",
} as const;
