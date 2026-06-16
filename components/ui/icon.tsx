"use client";

import { config, library } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faPlus, faMinus, faTrashCan, faDownload, faFloppyDisk, faClockRotateLeft, faXmark,
  faClock, faFileLines, faMagnifyingGlass, faUpload, faGripVertical, faCheck,
  faChevronLeft, faChevronRight, faChevronDown, faTableColumns, faSquareCheck,
  faImage, faGear, faMoon, faSun, faWallet, faArrowTrendUp, faArrowTrendDown,
  faWandMagicSparkles, faTriangleExclamation, faCircleCheck, faArrowUpRightFromSquare,
  faPlay, faCloudArrowUp, faSpinner, faFolder, faFolderOpen, faCalendarDay,
  faArrowLeft, faArrowRight, faChartPie, faChartLine, faChartColumn, faEllipsisVertical,
  faCircleDot, faListCheck, faFlag, faLink, faPen, faFilter, faCircle,
  faMoneyBillTrendUp, faReceipt, faBuilding, faUser, faEnvelope, faPhone,
  faDesktop, faRobot, faFlask, faCopy, faDatabase, faPenRuler,
  faDiagramProject, faLayerGroup, faLightbulb, faStar, faClone,
  faBriefcase, faPause, faStop, faPaperPlane, faLocationDot, faMoneyBillWave,
  faFilm, faVideo, faPalette, faShapes, faFont, faSquare, faRotateRight, faExpand,
  faMicrophone, faCube, faGem,
} from "@fortawesome/free-solid-svg-icons";

// Prevent Font Awesome from adding its CSS since we import it manually (SSR-safe)
config.autoAddCss = false;

library.add(
  faPlus, faMinus, faTrashCan, faDownload, faFloppyDisk, faClockRotateLeft, faXmark,
  faClock, faFileLines, faMagnifyingGlass, faUpload, faGripVertical, faCheck,
  faChevronLeft, faChevronRight, faChevronDown, faTableColumns, faSquareCheck,
  faImage, faGear, faMoon, faSun, faWallet, faArrowTrendUp, faArrowTrendDown,
  faWandMagicSparkles, faTriangleExclamation, faCircleCheck, faArrowUpRightFromSquare,
  faPlay, faCloudArrowUp, faSpinner, faFolder, faFolderOpen, faCalendarDay,
  faArrowLeft, faArrowRight, faChartPie, faChartLine, faChartColumn, faEllipsisVertical,
  faCircleDot, faListCheck, faFlag, faLink, faPen, faFilter, faCircle,
  faMoneyBillTrendUp, faReceipt, faBuilding, faUser, faEnvelope, faPhone,
  faDesktop, faRobot, faFlask, faCopy, faDatabase, faPenRuler,
  faDiagramProject, faLayerGroup, faLightbulb, faStar, faClone,
  faBriefcase, faPause, faStop, faPaperPlane, faLocationDot, faMoneyBillWave,
  faFilm, faVideo, faPalette, faShapes, faFont, faSquare, faRotateRight, faExpand,
  faMicrophone, faCube, faGem,
);

// Map friendly names → Font Awesome icon definitions.
const REGISTRY: Record<string, IconProp> = {
  plus: faPlus,
  minus: faMinus,
  trash: faTrashCan,
  download: faDownload,
  save: faFloppyDisk,
  history: faClockRotateLeft,
  x: faXmark,
  clock: faClock,
  "file-text": faFileLines,
  file: faFileLines,
  search: faMagnifyingGlass,
  upload: faUpload,
  grip: faGripVertical,
  check: faCheck,
  "chevron-left": faChevronLeft,
  "chevron-right": faChevronRight,
  "chevron-down": faChevronDown,
  dashboard: faTableColumns,
  columns: faTableColumns,
  "check-square": faSquareCheck,
  image: faImage,
  settings: faGear,
  moon: faMoon,
  sun: faSun,
  wallet: faWallet,
  "trending-up": faArrowTrendUp,
  "trending-down": faArrowTrendDown,
  sparkles: faWandMagicSparkles,
  "alert-triangle": faTriangleExclamation,
  "check-circle": faCircleCheck,
  "external-link": faArrowUpRightFromSquare,
  play: faPlay,
  "upload-cloud": faCloudArrowUp,
  spinner: faSpinner,
  folder: faFolder,
  "folder-open": faFolderOpen,
  calendar: faCalendarDay,
  "arrow-left": faArrowLeft,
  "arrow-right": faArrowRight,
  "chart-pie": faChartPie,
  "chart-line": faChartLine,
  "chart-bar": faChartColumn,
  "more-vertical": faEllipsisVertical,
  "circle-dot": faCircleDot,
  "list-check": faListCheck,
  flag: faFlag,
  link: faLink,
  edit: faPen,
  filter: faFilter,
  circle: faCircle,
  money: faMoneyBillTrendUp,
  receipt: faReceipt,
  building: faBuilding,
  user: faUser,
  email: faEnvelope,
  phone: faPhone,
  monitor: faDesktop,
  robot: faRobot,
  flask: faFlask,
  copy: faCopy,
  database: faDatabase,
  "pen-ruler": faPenRuler,
  workflow: faDiagramProject,
  layers: faLayerGroup,
  lightbulb: faLightbulb,
  star: faStar,
  clone: faClone,
  briefcase: faBriefcase,
  pause: faPause,
  stop: faStop,
  send: faPaperPlane,
  "map-pin": faLocationDot,
  "money-bill": faMoneyBillWave,
  film: faFilm,
  video: faVideo,
  palette: faPalette,
  shapes: faShapes,
  type: faFont,
  square: faSquare,
  rotate: faRotateRight,
  expand: faExpand,
  mic: faMicrophone,
  cube: faCube,
  gem: faGem,
};

export type IconName = keyof typeof REGISTRY;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  spin?: boolean;
}

/** Drop-in icon component backed by Font Awesome. */
export function Icon({ name, size = 16, className, style, spin }: IconProps) {
  const icon = REGISTRY[name] ?? faCircle;
  return (
    <FontAwesomeIcon
      icon={icon}
      spin={spin}
      className={className}
      style={{ width: size, height: size, fontSize: size, ...style }}
    />
  );
}
