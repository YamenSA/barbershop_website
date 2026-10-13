import SitePageFrame from "./SitePageFrame";
import BookingFlow, { type BookingFlowProps } from "./booking/BookingFlow";

export default function BookingPageView({ embedded = false, ...props }: BookingFlowProps & { embedded?: boolean }) {
  return <SitePageFrame profile={props.profile} hours={props.hours} activePath="/termin" embedded={embedded}><BookingFlow key={`${props.initialServiceId ?? ""}|${props.initialMemberId ?? ""}`} {...props} /></SitePageFrame>;
}
