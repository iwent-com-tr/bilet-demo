import React from 'react';

interface IconProps {
  className?: string;
}

export const MusicIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M10 21q-1.65 0-2.825-1.175T6 17t1.175-2.825T10 13q.575 0 1.063.138t.937.412V3h6v4h-4v10q0 1.65-1.175 2.825T10 21"/>
  </svg>
);

export const FestivalIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M2 22q.725-1.85.963-3.812t.287-3.938q-.975-.375-1.612-1.25T1 11V9q2.875-.95 5.863-2.9T12 2q2.15 2.15 5.138 4.1T23 9v2q0 1.125-.638 2t-1.612 1.25q.05 1.975.288 3.938T22 22zM5.9 9h12.2q-1.95-1.1-3.512-2.262T12 4.7q-1.025.875-2.588 2.038T5.9 9m8.6 3.5q.625 0 1.063-.437T16 11h-3q0 .625.438 1.063t1.062.437m-5 0q.625 0 1.063-.437T11 11H8q0 .625.438 1.063T9.5 12.5m-5 0q.625 0 1.063-.437T6 11H3q0 .625.438 1.063T4.5 12.5m.15 7.5h2.675q.225-1.5.35-2.975t.2-2.975q-.225-.125-.45-.263T7 13.45q-.375.375-.812.613t-.938.362q-.05 1.425-.175 2.813T4.65 20m4.7 0h5.3q-.2-1.375-.312-2.75t-.188-2.775q-.65-.05-1.187-.312T12 13.475q-.425.425-.987.688t-1.163.312q-.075 1.4-.187 2.775T9.35 20m7.325 0h2.675q-.3-1.375-.425-2.762t-.175-2.813q-.5-.125-.95-.363t-.8-.612q-.2.2-.425.338t-.45.262q.075 1.5.213 2.975T16.675 20m2.825-7.5q.625 0 1.063-.437T21 11h-3q0 .625.438 1.063t1.062.437"/>
  </svg>
);

export const UniversityIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M21 17v-6.9L12 15L1 9l11-6l11 6v8zm-9 4l-7-3.8v-5l7 3.8l7-3.8v5z"/>
  </svg>
);

export const WorkshopIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="none" stroke="currentColor" strokeWidth="2" d="M19 7s-5 7-12.5 7c-2 0-5.5 1-5.5 5v4h11v-4c0-2.5 3-1 7-8l-1.5-1.5M3 5V2h20v14h-3M11 1h4v2h-4zM6.5 14a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7Z"/>
  </svg>
);

export const ConferenceIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="none" stroke="currentColor" strokeWidth="1" d="M6 14.5H1.5v-13h21v13H18m-.5 9.5a10.6 10.6 0 0 1 1.572-5.555l.428-.695v-.25h-15v.25l.428.695A10.6 10.6 0 0 1 6.5 24m9.5-9v-3.5s-1.5-1-4-1s-4 1-4 1V15m3.85-6.5s-1.6-1-1.6-2.25a1.747 1.747 0 1 1 3.496 0c0 1.25-1.596 2.25-1.596 2.25z"/>
  </svg>
);

export const SportsIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M4.05 11H6.9q-.15-.95-.575-1.775T5.25 7.75q-.45.725-.763 1.538T4.05 11m13.05 0h2.85q-.125-.9-.437-1.713T18.75 7.75q-.65.65-1.075 1.475T17.1 11M5.25 16.25q.65-.65 1.075-1.475T6.9 13H4.05q.125.9.438 1.713t.762 1.537m13.5 0q.45-.725.763-1.537T19.95 13H17.1q.15.95.575 1.775t1.075 1.475M8.95 11H11V4.05q-1.325.2-2.463.738T6.5 6.2q.975.95 1.613 2.163T8.95 11M13 11h2.05q.2-1.425.838-2.637T17.5 6.2q-.9-.875-2.037-1.412T13 4.05zm-2 8.95V13H8.95q-.2 1.425-.837 2.638T6.5 17.8q.9.875 2.038 1.413T11 19.95m2 0q1.325-.2 2.463-.737T17.5 17.8q-.975-.95-1.612-2.162T15.05 13H13zM12 22q-2.075 0-3.9-.787t-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/>
  </svg>
);

export const TheaterIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M7 22q-2.5 0-4.25-1.75T1 16V9h12v7q0 2.5-1.75 4.25T7 22m-2-7.5q.425 0 .713-.288T6 13.5t-.288-.712T5 12.5t-.712.288T4 13.5t.288.713T5 14.5m2 3.4q.975 0 1.738-.513T9.5 16h-5q0 .875.763 1.388T7 17.9m2-3.4q.425 0 .713-.287T10 13.5t-.288-.712T9 12.5t-.712.288T8 13.5t.288.713T9 14.5m8 .5q-.65 0-1.287-.137T14.5 14.45V7.5H11V2h12v7q0 2.5-1.75 4.25T17 15m-2-7.5q.425 0 .713-.288T16 6.5t-.288-.712T15 5.5t-.712.288T14 6.5t.288.713T15 7.5m-.5 3.4h5q0-.875-.763-1.388T17 9q-.85 0-1.675.45T14.5 10.9M19 7.5q.425 0 .713-.288T20 6.5t-.288-.712T19 5.5t-.712.288T18 6.5t.288.713T19 7.5"/>
  </svg>
);

export const EducationIcon: React.FC<IconProps> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M7.5 22q-1.45 0-2.475-1.025T4 18.5v-13q0-1.45 1.025-2.475T7.5 2H18q.825 0 1.413.587T20 4v12.525q0 .2-.162.363t-.588.362q-.35.175-.55.5t-.2.75t.2.763t.55.487t.55.413t.2.562v.25q0 .425-.288.725T19 22zM9 15q.425 0 .713-.288T10 14V5q0-.425-.288-.712T9 4t-.712.288T8 5v9q0 .425.288.713T9 15m-1.5 5h9.325q-.15-.35-.237-.712T16.5 18.5q0-.4.075-.775t.25-.725H7.5q-.65 0-1.075.438T6 18.5q0 .65.425 1.075T7.5 20"/>
  </svg>
);