/*
 * loger.c
 *
 *  Created on: 28.09.2013
 *      Author: xp
 */
#include <stdio.h>

#include "loger.h"



void open_log(char *fname, t_log *LOG){
	LOG->pFile = fopen (fname,"a");
	if (LOG->pFile==0)
	  LOG->isOpend =  0;
	else
		LOG->isOpend=1;
	return;
	}

void close_log(t_log *LOG){
	if(LOG->isOpend)
		fclose(LOG->pFile);
	LOG->isOpend=0;
	return;
	}


void write_log(char *msg, t_log *LOG){
	if(LOG->isOpend){
		fputs(msg, LOG->pFile);
		}
	return;
	}
