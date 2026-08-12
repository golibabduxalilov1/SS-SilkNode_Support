import { SVGProps } from 'react';
import { ChevronLeft, FileText, Loader2, Paperclip, Send, ShieldAlert, TriangleAlert } from 'lucide-react';

type IconProps = SVGProps<SVGSVGElement>;

const STROKE = 1.75;

export const IconChevronLeft = (props: IconProps) => <ChevronLeft strokeWidth={STROKE} {...props} />;
export const IconSpinner = (props: IconProps) => <Loader2 strokeWidth={STROKE} {...props} />;
export const IconPaperclip = (props: IconProps) => <Paperclip strokeWidth={STROKE} {...props} />;
export const IconFileText = (props: IconProps) => <FileText strokeWidth={STROKE} {...props} />;
export const IconSend = (props: IconProps) => <Send strokeWidth={STROKE} {...props} />;
export const IconShieldAlert = (props: IconProps) => <ShieldAlert strokeWidth={STROKE} {...props} />;
export const IconWarning = (props: IconProps) => <TriangleAlert strokeWidth={STROKE} {...props} />;
