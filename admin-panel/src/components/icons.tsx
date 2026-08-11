import { SVGProps } from 'react';
import {
  LayoutGrid,
  Building2,
  LogOut,
  Search,
  Inbox,
  CirclePlus,
  Loader2,
  Hourglass,
  CheckCircle2,
  Layers,
  Clock,
  ChevronLeft,
  Users,
  Pencil,
  Power,
  Plus,
  Paperclip,
  Send,
  Lock,
  Menu,
  X,
  Bell,
  Trash2,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

type IconProps = SVGProps<SVGSVGElement>;

const STROKE = 1.75;

export const IconGrid = (props: IconProps) => <LayoutGrid strokeWidth={STROKE} {...props} />;
export const IconBuilding = (props: IconProps) => <Building2 strokeWidth={STROKE} {...props} />;
export const IconLogout = (props: IconProps) => <LogOut strokeWidth={STROKE} {...props} />;
export const IconSearch = (props: IconProps) => <Search strokeWidth={STROKE} {...props} />;
export const IconInbox = (props: IconProps) => <Inbox strokeWidth={STROKE} {...props} />;
export const IconTicketNew = (props: IconProps) => <CirclePlus strokeWidth={STROKE} {...props} />;
export const IconSpinner = (props: IconProps) => <Loader2 strokeWidth={STROKE} {...props} />;
export const IconWait = (props: IconProps) => <Hourglass strokeWidth={STROKE} {...props} />;
export const IconCheck = (props: IconProps) => <CheckCircle2 strokeWidth={STROKE} {...props} />;
export const IconLayers = (props: IconProps) => <Layers strokeWidth={STROKE} {...props} />;
export const IconClock = (props: IconProps) => <Clock strokeWidth={STROKE} {...props} />;
export const IconChevronLeft = (props: IconProps) => <ChevronLeft strokeWidth={STROKE} {...props} />;
export const IconUsers = (props: IconProps) => <Users strokeWidth={STROKE} {...props} />;
export const IconEdit = (props: IconProps) => <Pencil strokeWidth={STROKE} {...props} />;
export const IconPower = (props: IconProps) => <Power strokeWidth={STROKE} {...props} />;
export const IconPlus = (props: IconProps) => <Plus strokeWidth={STROKE} {...props} />;
export const IconPaperclip = (props: IconProps) => <Paperclip strokeWidth={STROKE} {...props} />;
export const IconSend = (props: IconProps) => <Send strokeWidth={STROKE} {...props} />;
export const IconLock = (props: IconProps) => <Lock strokeWidth={STROKE} {...props} />;
export const IconMenu = (props: IconProps) => <Menu strokeWidth={STROKE} {...props} />;
export const IconClose = (props: IconProps) => <X strokeWidth={STROKE} {...props} />;
export const IconBell = (props: IconProps) => <Bell strokeWidth={STROKE} {...props} />;
export const IconTrash = (props: IconProps) => <Trash2 strokeWidth={STROKE} {...props} />;
export const IconUser = (props: IconProps) => <User strokeWidth={STROKE} {...props} />;
export const IconEye = (props: IconProps) => <Eye strokeWidth={STROKE} {...props} />;
export const IconEyeOff = (props: IconProps) => <EyeOff strokeWidth={STROKE} {...props} />;
export const IconAlert = (props: IconProps) => <AlertCircle strokeWidth={STROKE} {...props} />;
export const IconShield = (props: IconProps) => <ShieldCheck strokeWidth={STROKE} {...props} />;
