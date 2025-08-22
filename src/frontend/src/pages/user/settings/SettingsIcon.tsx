import React from 'react';

interface IconProps {
  className?: string;
}

export const Tickets: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M7 23q-.825 0-1.412-.587T5 21V3q0-.825.588-1.412T7 1h10q.825 0 1.413.588T19 3v3.1q.45.175.725.55T20 7.5v2q0 .475-.275.85T19 10.9V21q0 .825-.587 1.413T17 23zm0-2h10V3H7zm0 0V3zm2-5h6q.425 0 .713-.288T16 15v-2q-.425 0-.712-.288T15 12t.288-.712T16 11V9q0-.425-.288-.712T15 8H9q-.425 0-.712.288T8 9v2q.425 0 .713.288T9 12t-.288.713T8 13v2q0 .425.288.713T9 16m3-1.5q-.2 0-.35-.15T11.5 14t.15-.35t.35-.15t.35.15t.15.35t-.15.35t-.35.15m0-2q-.2 0-.35-.15T11.5 12t.15-.35t.35-.15t.35.15t.15.35t-.15.35t-.35.15m0-2q-.2 0-.35-.15T11.5 10t.15-.35t.35-.15t.35.15t.15.35t-.15.35t-.35.15"/>
    </svg>
);
export const FavoriteEvents: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M10.95 18.35L7.4 14.8l1.45-1.45l2.1 2.1l4.2-4.2l1.45 1.45zM5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V2h2v2h8V2h2v2h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5z"/>
    </svg>
);
export const Blocked: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q1.35 0 2.6-.437t2.3-1.263L5.7 7.1q-.825 1.05-1.263 2.3T4 12q0 3.35 2.325 5.675T12 20m6.3-3.1q.825-1.05 1.263-2.3T20 12q0-3.35-2.325-5.675T12 4q-1.35 0-2.6.437T7.1 5.7z"/>
    </svg>
);
export const Privacy: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M6 22q-.825 0-1.412-.587T4 20V10q0-.825.588-1.412T6 8h1V6q0-2.075 1.463-3.537T12 1t3.538 1.463T17 6v2h1q.825 0 1.413.588T20 10v10q0 .825-.587 1.413T18 22zm0-2h12V10H6zm6-3q.825 0 1.413-.587T14 15t-.587-1.412T12 13t-1.412.588T10 15t.588 1.413T12 17M9 8h6V6q0-1.25-.875-2.125T12 3t-2.125.875T9 6zM6 20V10z"/>
    </svg>
);
export const Notification: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M4 19v-2h2v-7q0-2.075 1.25-3.687T10.5 4.2v-.7q0-.625.438-1.062T12 2t1.063.438T13.5 3.5v.7q2 .5 3.25 2.113T18 10v7h2v2zm8 3q-.825 0-1.412-.587T10 20h4q0 .825-.587 1.413T12 22"/>
    </svg>
);
export const Message: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="m6 18l-2.3 2.3q-.475.475-1.088.213T2 19.575V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-.85-2H20V4H4v13.125zM4 16V4zm4-5q.425 0 .713-.288T9 10t-.288-.712T8 9t-.712.288T7 10t.288.713T8 11m4 0q.425 0 .713-.288T13 10t-.288-.712T12 9t-.712.288T11 10t.288.713T12 11m4 0q.425 0 .713-.288T17 10t-.288-.712T16 9t-.712.288T15 10t.288.713T16 11"/>
    </svg>
);
export const SocialMedia: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M13.75 7.75h2.5q.325 0 .538-.213T17 7t-.213-.537t-.537-.213h-2.5q-.325 0-.537.213T13 7t.213.538t.537.212M3 23q-.825 0-1.412-.587T1 21v-8q0-.825.588-1.412T3 11h12q.825 0 1.413.588T17 13v8q0 .825-.587 1.413T15 23zm15.5-9v-1q0-.95-.462-1.812T16.8 9.525h.2q1.25 0 2.125-.638T20 7t-.875-2.125T17 4h-.5q-.325 0-.537.213t-.213.537t.213.538t.537.212h.5q.625 0 1.063.438T18.5 7t-.437 1.063T17 8.5h-.5q-.325 0-.537.213t-.213.537t.213.3t.537-.025h-.75q-.2 0-.375-.012T15 9.5h-.75v-.25q0-.325-.213-.537T13.5 8.5H13q-.625 0-1.062-.437T11.5 7t.438-1.062T13 5.5h.5q.325 0 .538-.213t.212-.537t-.213-.537T13.5 4H13q-1.25 0-2.125.875T10 7q0 .8.375 1.438T11.35 9.5H7V3q0-.825.588-1.412T9 1h12q.825 0 1.413.588T23 3v9q0 .825-.587 1.413T21 14zm-7.675 3.425q.25-.15.25-.425t-.25-.425l-2.55-1.6q-.25-.15-.513-.012T7.5 15.4v3.2q0 .3.263.438t.512-.013z"/>
    </svg>
);
export const Evaluations: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="m12 16.3l-3.7 2.825q-.275.225-.6.213t-.575-.188t-.387-.475t-.013-.65L8.15 13.4l-3.625-2.575q-.3-.2-.375-.525t.025-.6t.35-.488t.6-.212H9.6l1.45-4.8q.125-.35.388-.538T12 3.475t.563.188t.387.537L14.4 9h4.475q.35 0 .6.213t.35.487t.025.6t-.375.525L15.85 13.4l1.425 4.625q.125.35-.012.65t-.388.475t-.575.188t-.6-.213z"/>
    </svg>
);
