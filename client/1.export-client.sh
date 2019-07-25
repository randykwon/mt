#!/bin/bash

# Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# This bash shell script creates VPC / VPC Enpoint / Roles / EC2 / ELB / Security group. 
# The created EC2 instance will function as Fabric Client and REST API server. 


echo 1. awscli install.
sudo pip install awscli --upgrade


echo 2. export env settings
#In Cloud9:
#export REGION=us-east-1
#export NETWORKID=<the network ID you created in Step1, from the Amazon Managed Blockchain Console>
#export NETWORKNAME=<the name you gave the network>
export REGION=us-east-1
export NETWORKID=n-RMBIOZXBUBAMPB2VIYCCTH74RU
export NETWORKNAME=mtube
#
#In Cloud9:Set the VPC endpoint
#
echo 3. VPCEndPoint
export VPCENDPOINTSERVICENAME=$(aws managedblockchain get-network --region $REGION --network-id $NETWORKID --query 'Network.VpcEndpointServiceName' --output text)
echo $VPCENDPOINTSERVICENAME