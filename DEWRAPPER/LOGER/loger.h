/*
 * loger.h
 *
 *  Created on: 25.09.2013
 *      Author: xp
 */

#ifndef LOGER_H_
#define LOGER_H_

typedef struct {
	unsigned char isOpend;
	FILE *pFile;
} t_log;



void open_log(char *fname, t_log *LOG);
void close_log(t_log *LOG);
void write_log(char *msg, t_log *LOG);



#endif /* LOGER_H_ */
