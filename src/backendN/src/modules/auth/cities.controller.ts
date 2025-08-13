// src/modules/auth/cities.controller.ts
import { Request, Response, NextFunction } from 'express';
import { getCities, getCountiesForCity, GetCountiesDTO } from './auth.dto';

export const getCitiesList = async (req: Request, res: Response) => {
  const cities = getCities();
  res.json({ cities });
};

export const getCounties = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { city } = GetCountiesDTO.parse(req.query);
    const counties = getCountiesForCity(city);
    res.json({ city, counties });
  } catch (e) { 
    next(e); 
  }
};
