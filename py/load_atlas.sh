#!/bin/bash          
python truncate_database.py
rm -rf /Applications/MAMP/htdocs/atlas/img/*
python load_dicom_dataset.py "/Users/neil/Desktop/dataset" "/Applications/MAMP/htdocs/atlas/img"